import type { Config, Context } from '@netlify/functions'
import { eq, and, sql } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { renderMarkdown } from './_shared/markdown.js'
import { requireAuth } from './_shared/auth.js'

async function updateWeekStats(weekId: string) {
  const weekTasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.weekId, weekId))

  const totalTasks = weekTasks.length
  const completedTasks = weekTasks.filter((t) => t.status === 'completed').length

  await db
    .update(schema.weeks)
    .set({ totalTasks, completedTasks, updatedAt: new Date() })
    .where(eq(schema.weeks.id, weekId))
}

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, taskId } = context.params
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]

  // GET /api/goals-tasks/:taskId/notes
  if (taskId) {
    if (req.method !== 'GET') return methodNotAllowed()

    const taskNotes = await db
      .select()
      .from(schema.notes)
      .where(eq(schema.notes.taskId, parseInt(taskId, 10)))

    return json(taskNotes)
  }

  // Routes with :id
  if (id) {
    const taskId = parseInt(id, 10)

    // POST /api/goals-tasks/:id/toggle
    if (lastSegment === 'toggle') {
      if (req.method !== 'POST') return methodNotAllowed()

      const [task] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, taskId))
        .limit(1)

      if (!task) return notFound('Task not found')

      const newStatus = task.status === 'pending' ? 'completed' : 'pending'

      const [updated] = await db
        .update(schema.tasks)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(schema.tasks.id, taskId))
        .returning()

      await updateWeekStats(task.weekId)

      return json(updated)
    }

    // POST /api/goals-tasks/:id/to-backlog
    if (lastSegment === 'to-backlog') {
      if (req.method !== 'POST') return methodNotAllowed()

      const [task] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, taskId))
        .limit(1)

      if (!task) return notFound('Task not found')

      // Create backlog item from task
      const [backlogItem] = await db
        .insert(schema.backlogItems)
        .values({
          categoryId: task.categoryId,
          title: task.title,
          contentMarkdown: task.contentMarkdown,
          contentHtml: task.contentHtml,
          priority: 0,
        })
        .returning()

      // Copy notes from task to backlog item
      const taskNotes = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.taskId, taskId))

      for (const note of taskNotes) {
        await db.insert(schema.notes).values({
          backlogItemId: backlogItem.id,
          contentMarkdown: note.contentMarkdown,
          contentHtml: note.contentHtml,
        })
      }

      // Delete the task (cascade deletes its notes)
      await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId))

      await updateWeekStats(task.weekId)

      return json(backlogItem, 201)
    }

    // GET /api/goals-tasks/:id
    if (req.method === 'GET') {
      const [result] = await db
        .select({
          task: schema.tasks,
          category: schema.categories,
        })
        .from(schema.tasks)
        .leftJoin(
          schema.categories,
          eq(schema.tasks.categoryId, schema.categories.id),
        )
        .where(eq(schema.tasks.id, taskId))
        .limit(1)

      if (!result) return notFound('Task not found')

      return json({ ...result.task, category: result.category })
    }

    // PATCH /api/goals-tasks/:id
    if (req.method === 'PATCH') {
      let body: {
        title?: string
        categoryId?: number | null
        contentMarkdown?: string | null
        status?: 'pending' | 'completed'
        tags?: string[]
      }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      const [existing] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, taskId))
        .limit(1)

      if (!existing) return notFound('Task not found')

      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (body.title !== undefined) updates.title = body.title
      if (body.categoryId !== undefined) updates.categoryId = body.categoryId
      if (body.tags !== undefined) updates.tags = body.tags
      if (body.status !== undefined) updates.status = body.status
      if (body.contentMarkdown !== undefined) {
        updates.contentMarkdown = body.contentMarkdown
        updates.contentHtml = body.contentMarkdown
          ? await renderMarkdown(body.contentMarkdown)
          : null
      }

      const [updated] = await db
        .update(schema.tasks)
        .set(updates)
        .where(eq(schema.tasks.id, taskId))
        .returning()

      if (body.status !== undefined) {
        await updateWeekStats(existing.weekId)
      }

      return json(updated)
    }

    // DELETE /api/goals-tasks/:id
    if (req.method === 'DELETE') {
      const [task] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, taskId))
        .limit(1)

      if (!task) return notFound('Task not found')

      await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId))
      await updateWeekStats(task.weekId)

      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-tasks
  if (req.method === 'GET') {
    const weekId = url.searchParams.get('weekId')

    let taskRows
    if (weekId) {
      taskRows = await db
        .select({
          task: schema.tasks,
          category: schema.categories,
        })
        .from(schema.tasks)
        .leftJoin(
          schema.categories,
          eq(schema.tasks.categoryId, schema.categories.id),
        )
        .where(eq(schema.tasks.weekId, weekId))
    } else {
      taskRows = await db
        .select({
          task: schema.tasks,
          category: schema.categories,
        })
        .from(schema.tasks)
        .leftJoin(
          schema.categories,
          eq(schema.tasks.categoryId, schema.categories.id),
        )
    }

    return json(
      taskRows.map((row) => ({
        ...row.task,
        category: row.category,
      })),
    )
  }

  // POST /api/goals-tasks
  if (req.method === 'POST') {
    let body: {
      weekId: string
      categoryId?: number | null
      title: string
      contentMarkdown?: string | null
      isRecurring?: boolean
      tags?: string[]
    }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.weekId || !body.title) {
      return error('weekId and title are required')
    }

    const contentHtml = body.contentMarkdown
      ? await renderMarkdown(body.contentMarkdown)
      : null

    const [task] = await db
      .insert(schema.tasks)
      .values({
        weekId: body.weekId,
        categoryId: body.categoryId || null,
        title: body.title,
        contentMarkdown: body.contentMarkdown || null,
        contentHtml,
        isRecurring: body.isRecurring || false,
        tags: body.tags || [],
      })
      .returning()

    await updateWeekStats(body.weekId)

    return json(task, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: [
    '/api/goals-tasks',
    '/api/goals-tasks/:id',
    '/api/goals-tasks/:id/toggle',
    '/api/goals-tasks/:id/to-backlog',
    '/api/goals-tasks/:taskId/notes',
  ],
}
