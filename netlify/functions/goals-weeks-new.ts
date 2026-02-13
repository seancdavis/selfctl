import type { Config, Context } from '@netlify/functions'
import { eq, and, ne } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, methodNotAllowed } from './_shared/response.js'
import { renderMarkdown } from './_shared/markdown.js'
import { requireAuth } from './_shared/auth.js'

function getWeekStartDate(weekId: string): string {
  const [yearStr, weekStr] = weekId.split('-')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)

  // ISO 8601: Week 1 contains Jan 4th. Find Monday of week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7 // Convert Sunday=0 to 7
  const mondayOfWeek1 = new Date(jan4)
  mondayOfWeek1.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1))

  // Add (week - 1) * 7 days to get Monday of target week
  const targetMonday = new Date(mondayOfWeek1)
  targetMonday.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7)

  return targetMonday.toISOString().split('T')[0]
}

function getWeekEndDate(weekId: string): string {
  const startDate = getWeekStartDate(weekId)
  const sunday = new Date(startDate + 'T00:00:00Z')
  sunday.setUTCDate(sunday.getUTCDate() + 6)
  return sunday.toISOString().split('T')[0]
}

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { previousWeekId } = context.params
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)

  // Determine if this is a /data route
  const isDataRoute = pathSegments.includes('data')

  // GET /api/goals-weeks-new/data or /api/goals-weeks-new/data/:previousWeekId
  if (req.method === 'GET' && isDataRoute) {
    // Get active recurring tasks
    const recurringTasks = await db
      .select()
      .from(schema.recurringTasks)
      .where(eq(schema.recurringTasks.isActive, true))

    // Get follow-ups
    const followUps = await db
      .select({
        followUp: schema.followUps,
        category: schema.categories,
      })
      .from(schema.followUps)
      .leftJoin(schema.categories, eq(schema.followUps.categoryId, schema.categories.id))

    const followUpsData = followUps.map((row) => ({
      ...row.followUp,
      category: row.category,
    }))

    // Get backlog items
    const backlogItems = await db
      .select({
        backlogItem: schema.backlogItems,
        category: schema.categories,
      })
      .from(schema.backlogItems)
      .leftJoin(
        schema.categories,
        eq(schema.backlogItems.categoryId, schema.categories.id),
      )

    const backlogData = backlogItems.map((row) => ({
      ...row.backlogItem,
      category: row.category,
    }))

    // Get incomplete tasks from previous week if specified
    let incompleteTasks: Array<Record<string, unknown>> = []
    if (previousWeekId) {
      const prevTasks = await db
        .select({
          task: schema.tasks,
          category: schema.categories,
        })
        .from(schema.tasks)
        .leftJoin(
          schema.categories,
          eq(schema.tasks.categoryId, schema.categories.id),
        )
        .where(
          and(
            eq(schema.tasks.weekId, previousWeekId),
            eq(schema.tasks.status, 'pending'),
          ),
        )

      incompleteTasks = prevTasks.map((row) => ({
        ...row.task,
        category: row.category,
      }))
    }

    return json({
      recurringTasks,
      incompleteTasks,
      followUps: followUpsData,
      backlogItems: backlogData,
    })
  }

  // POST /api/goals-weeks-new
  if (req.method === 'POST' && !isDataRoute) {
    let body: {
      weekId: string
      recurringTaskIds?: number[]
      incompleteTaskIds?: number[]
      followUpIds?: number[]
      backlogItemIds?: number[]
      newTasks?: Array<{
        title: string
        categoryId?: number
        contentMarkdown?: string
      }>
    }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.weekId) {
      return error('weekId is required')
    }

    const startDate = getWeekStartDate(body.weekId)
    const endDate = getWeekEndDate(body.weekId)

    // Create the week
    const [week] = await db
      .insert(schema.weeks)
      .values({
        id: body.weekId,
        startDate,
        endDate,
      })
      .returning()

    const createdTasks: Array<Record<string, unknown>> = []

    // Add recurring tasks
    if (body.recurringTaskIds?.length) {
      const recurring = await db
        .select()
        .from(schema.recurringTasks)
        .where(eq(schema.recurringTasks.isActive, true))

      for (const rt of recurring) {
        if (!body.recurringTaskIds.includes(rt.id)) continue
        const [task] = await db
          .insert(schema.tasks)
          .values({
            weekId: body.weekId,
            categoryId: rt.categoryId,
            title: rt.title,
            contentMarkdown: rt.contentMarkdown,
            contentHtml: rt.contentHtml,
            isRecurring: true,
          })
          .returning()
        createdTasks.push(task)
      }
    }

    // Carry over incomplete tasks
    if (body.incompleteTaskIds?.length) {
      for (const taskId of body.incompleteTaskIds) {
        const [prevTask] = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.id, taskId))
          .limit(1)

        if (prevTask) {
          const [task] = await db
            .insert(schema.tasks)
            .values({
              weekId: body.weekId,
              categoryId: prevTask.categoryId,
              title: prevTask.title,
              contentMarkdown: prevTask.contentMarkdown,
              contentHtml: prevTask.contentHtml,
              isRecurring: prevTask.isRecurring,
              stalenessCount: prevTask.stalenessCount + 1,
              previousVersionId: prevTask.id,
            })
            .returning()
          createdTasks.push(task)
        }
      }
    }

    // Add follow-ups as tasks
    if (body.followUpIds?.length) {
      for (const followUpId of body.followUpIds) {
        const [followUp] = await db
          .select()
          .from(schema.followUps)
          .where(eq(schema.followUps.id, followUpId))
          .limit(1)

        if (followUp) {
          const [task] = await db
            .insert(schema.tasks)
            .values({
              weekId: body.weekId,
              categoryId: followUp.categoryId,
              title: followUp.title,
              contentMarkdown: followUp.contentMarkdown,
              contentHtml: followUp.contentHtml,
            })
            .returning()
          createdTasks.push(task)

          // Delete the follow-up after converting
          await db.delete(schema.followUps).where(eq(schema.followUps.id, followUpId))
        }
      }
    }

    // Add backlog items as tasks
    if (body.backlogItemIds?.length) {
      for (const backlogItemId of body.backlogItemIds) {
        const [item] = await db
          .select()
          .from(schema.backlogItems)
          .where(eq(schema.backlogItems.id, backlogItemId))
          .limit(1)

        if (item) {
          const [task] = await db
            .insert(schema.tasks)
            .values({
              weekId: body.weekId,
              categoryId: item.categoryId,
              title: item.title,
              contentMarkdown: item.contentMarkdown,
              contentHtml: item.contentHtml,
            })
            .returning()
          createdTasks.push(task)

          // Copy notes from backlog item to new task
          const backlogNotes = await db
            .select()
            .from(schema.notes)
            .where(eq(schema.notes.backlogItemId, backlogItemId))

          for (const note of backlogNotes) {
            await db.insert(schema.notes).values({
              taskId: task.id,
              contentMarkdown: note.contentMarkdown,
              contentHtml: note.contentHtml,
            })
          }

          // Delete backlog item (cascade deletes its notes)
          await db
            .delete(schema.backlogItems)
            .where(eq(schema.backlogItems.id, backlogItemId))
        }
      }
    }

    // Add brand new tasks
    if (body.newTasks?.length) {
      for (const nt of body.newTasks) {
        const contentHtml = nt.contentMarkdown
          ? await renderMarkdown(nt.contentMarkdown)
          : null
        const [task] = await db
          .insert(schema.tasks)
          .values({
            weekId: body.weekId,
            categoryId: nt.categoryId || null,
            title: nt.title,
            contentMarkdown: nt.contentMarkdown || null,
            contentHtml,
          })
          .returning()
        createdTasks.push(task)
      }
    }

    // Update week stats
    await db
      .update(schema.weeks)
      .set({
        totalTasks: createdTasks.length,
        completedTasks: 0,
        updatedAt: new Date(),
      })
      .where(eq(schema.weeks.id, body.weekId))

    return json({ week, tasks: createdTasks }, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: [
    '/api/goals-weeks-new',
    '/api/goals-weeks-new/data',
    '/api/goals-weeks-new/data/:previousWeekId',
  ],
}
