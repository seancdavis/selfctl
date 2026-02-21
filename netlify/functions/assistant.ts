import type { Config, Context } from '@netlify/functions'
import { eq, and, lte, gte, asc } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { renderMarkdown } from './_shared/markdown.js'
import { validateApiKey } from './_shared/webhook-auth.js'

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
  if (!validateApiKey(req, 'ASSISTANT_API_KEY')) {
    return error('Unauthorized', 401)
  }

  const { id } = context.params
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]

  // POST /api/assistant/tasks/:id/toggle
  // POST /api/assistant/tasks/:id/skip
  if (id) {
    if (lastSegment !== 'toggle' && lastSegment !== 'skip') return notFound()
    if (req.method !== 'POST') return methodNotAllowed()

    const taskId = parseInt(id, 10)
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, taskId))
      .limit(1)

    if (!task) return notFound('Task not found')

    if (lastSegment === 'skip') {
      const [updated] = await db
        .update(schema.tasks)
        .set({ skipped: !task.skipped, updatedAt: new Date() })
        .where(eq(schema.tasks.id, taskId))
        .returning()

      return json(updated)
    }

    const newStatus = task.status === 'pending' ? 'completed' : 'pending'

    const [updated] = await db
      .update(schema.tasks)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(schema.tasks.id, taskId))
      .returning()

    await updateWeekStats(task.weekId)

    return json(updated)
  }

  // GET /api/assistant/tasks
  if (lastSegment === 'tasks') {
    if (req.method !== 'GET') return methodNotAllowed()

    const today = new Date().toISOString().split('T')[0]
    const [activeWeek] = await db
      .select()
      .from(schema.weeks)
      .where(and(lte(schema.weeks.startDate, today), gte(schema.weeks.endDate, today)))
      .limit(1)

    if (!activeWeek) return notFound('No active week')

    const weekTasks = await db
      .select({
        task: schema.tasks,
        category: schema.categories,
      })
      .from(schema.tasks)
      .leftJoin(schema.categories, eq(schema.tasks.categoryId, schema.categories.id))
      .where(eq(schema.tasks.weekId, activeWeek.id))
      .orderBy(asc(schema.tasks.sortOrder), asc(schema.tasks.id))

    return json({
      week: {
        label: activeWeek.label,
        startDate: activeWeek.startDate,
        endDate: activeWeek.endDate,
      },
      tasks: weekTasks.map((row) => ({
        id: row.task.id,
        title: row.task.title,
        status: row.task.status,
        skipped: row.task.skipped,
        category: row.category?.name ?? null,
        tags: row.task.tags ?? [],
      })),
    })
  }

  // POST /api/assistant/notes
  if (lastSegment === 'notes') {
    if (req.method !== 'POST') return methodNotAllowed()

    let body: { taskId: number; contentMarkdown: string }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.taskId || !body.contentMarkdown) {
      return error('taskId and contentMarkdown are required')
    }

    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, body.taskId))
      .limit(1)

    if (!task) return notFound('Task not found')

    const contentHtml = await renderMarkdown(body.contentMarkdown)

    const [note] = await db
      .insert(schema.notes)
      .values({
        taskId: body.taskId,
        contentMarkdown: body.contentMarkdown,
        contentHtml,
      })
      .returning()

    return json(note, 201)
  }

  // POST /api/assistant/backlog
  if (lastSegment === 'backlog') {
    if (req.method !== 'POST') return methodNotAllowed()

    let body: {
      title: string
      contentMarkdown?: string
      categoryId?: number
      tags?: string[]
    }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.title) {
      return error('title is required')
    }

    const contentHtml = body.contentMarkdown
      ? await renderMarkdown(body.contentMarkdown)
      : null

    const [item] = await db
      .insert(schema.backlogItems)
      .values({
        title: body.title,
        categoryId: body.categoryId || null,
        contentMarkdown: body.contentMarkdown || null,
        contentHtml,
        tags: body.tags || [],
        priority: 0,
      })
      .returning()

    return json(item, 201)
  }

  return notFound()
}

export const config: Config = {
  path: [
    '/api/assistant/tasks',
    '/api/assistant/tasks/:id/toggle',
    '/api/assistant/tasks/:id/skip',
    '/api/assistant/notes',
    '/api/assistant/backlog',
  ],
}
