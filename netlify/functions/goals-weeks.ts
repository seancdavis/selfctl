import type { Config, Context } from '@netlify/functions'
import { eq, desc, asc } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, weekId, reorderWeekId } = context.params
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]

  // POST /api/goals-weeks/:reorderWeekId/reorder
  if (reorderWeekId) {
    if (req.method !== 'POST') return methodNotAllowed()

    let body: { taskIds: number[] }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.taskIds || !Array.isArray(body.taskIds)) {
      return error('taskIds array is required')
    }

    for (let i = 0; i < body.taskIds.length; i++) {
      await db
        .update(schema.tasks)
        .set({ sortOrder: i })
        .where(eq(schema.tasks.id, body.taskIds[i]))
    }

    return json({ success: true })
  }

  // GET /api/goals-weeks/:weekId/tasks
  if (weekId) {
    if (req.method !== 'GET') return methodNotAllowed()

    const weekTasks = await db
      .select({
        task: schema.tasks,
        category: schema.categories,
      })
      .from(schema.tasks)
      .leftJoin(schema.categories, eq(schema.tasks.categoryId, schema.categories.id))
      .where(eq(schema.tasks.weekId, weekId))
      .orderBy(asc(schema.tasks.sortOrder), asc(schema.tasks.id))

    return json(
      weekTasks.map((row) => ({
        ...row.task,
        category: row.category,
      })),
    )
  }

  // GET /api/goals-weeks/:id
  if (id) {
    if (req.method === 'GET') {
      const [week] = await db
        .select()
        .from(schema.weeks)
        .where(eq(schema.weeks.id, id))
        .limit(1)

      if (!week) return notFound('Week not found')
      return json(week)
    }

    if (req.method === 'DELETE') {
      const [week] = await db
        .select()
        .from(schema.weeks)
        .where(eq(schema.weeks.id, id))
        .limit(1)

      if (!week) return notFound('Week not found')

      await db.delete(schema.weeks).where(eq(schema.weeks.id, id))
      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-weeks
  if (req.method === 'GET') {
    const weeks = await db
      .select()
      .from(schema.weeks)
      .orderBy(desc(schema.weeks.id))

    return json(weeks)
  }

  // POST /api/goals-weeks
  if (req.method === 'POST') {
    let body: { id: string; startDate: string; endDate: string }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.id || !body.startDate || !body.endDate) {
      return error('id, startDate, and endDate are required')
    }

    const [week] = await db
      .insert(schema.weeks)
      .values({
        id: body.id,
        startDate: body.startDate,
        endDate: body.endDate,
      })
      .returning()

    return json(week, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: ['/api/goals-weeks', '/api/goals-weeks/:id', '/api/goals-weeks/:weekId/tasks', '/api/goals-weeks/:reorderWeekId/reorder'],
}
