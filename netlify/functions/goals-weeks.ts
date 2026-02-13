import type { Config, Context } from '@netlify/functions'
import { eq, desc } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, weekId } = context.params

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
  path: ['/api/goals-weeks', '/api/goals-weeks/:id', '/api/goals-weeks/:weekId/tasks'],
}
