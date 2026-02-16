import type { Config, Context } from '@netlify/functions'
import { eq, desc, asc, and, ne, lte, gte } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { requireAuth } from './_shared/auth.js'

async function checkOverlap(startDate: string, endDate: string, excludeId?: string) {
  const conditions = [
    lte(schema.weeks.startDate, endDate),
    gte(schema.weeks.endDate, startDate),
  ]
  if (excludeId) {
    conditions.push(ne(schema.weeks.id, excludeId))
  }
  const overlapping = await db
    .select()
    .from(schema.weeks)
    .where(and(...conditions))
    .limit(1)
  return overlapping.length > 0 ? overlapping[0] : null
}

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { label, weekLabel, reorderLabel } = context.params
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]

  // GET /api/goals-weeks/find-active
  if (lastSegment === 'find-active') {
    if (req.method !== 'GET') return methodNotAllowed()

    const today = new Date().toISOString().split('T')[0]
    const [activeWeek] = await db
      .select()
      .from(schema.weeks)
      .where(and(lte(schema.weeks.startDate, today), gte(schema.weeks.endDate, today)))
      .limit(1)

    if (!activeWeek) return notFound('No active week')
    return json(activeWeek)
  }

  // POST /api/goals-weeks/:reorderLabel/reorder
  if (reorderLabel) {
    if (req.method !== 'POST') return methodNotAllowed()

    const [week] = await db
      .select()
      .from(schema.weeks)
      .where(eq(schema.weeks.label, reorderLabel))
      .limit(1)

    if (!week) return notFound('Week not found')

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

  // GET /api/goals-weeks/:weekLabel/tasks
  if (weekLabel) {
    if (req.method !== 'GET') return methodNotAllowed()

    const [week] = await db
      .select()
      .from(schema.weeks)
      .where(eq(schema.weeks.label, weekLabel))
      .limit(1)

    if (!week) return notFound('Week not found')

    const weekTasks = await db
      .select({
        task: schema.tasks,
        category: schema.categories,
      })
      .from(schema.tasks)
      .leftJoin(schema.categories, eq(schema.tasks.categoryId, schema.categories.id))
      .where(eq(schema.tasks.weekId, week.id))
      .orderBy(asc(schema.tasks.sortOrder), asc(schema.tasks.id))

    return json(
      weekTasks.map((row) => ({
        ...row.task,
        category: row.category,
      })),
    )
  }

  // GET/PATCH/DELETE /api/goals-weeks/:label
  if (label) {
    const [week] = await db
      .select()
      .from(schema.weeks)
      .where(eq(schema.weeks.label, label))
      .limit(1)

    if (!week) return notFound('Week not found')

    if (req.method === 'GET') {
      return json(week)
    }

    if (req.method === 'PATCH') {
      let body: { label?: string; startDate?: string; endDate?: string }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      const newStartDate = body.startDate ?? week.startDate
      const newEndDate = body.endDate ?? week.endDate

      // Overlap validation
      const overlap = await checkOverlap(newStartDate, newEndDate, week.id)
      if (overlap) {
        return error(`Date range overlaps with week ${overlap.label}`, 409)
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (body.label !== undefined) updates.label = body.label
      if (body.startDate !== undefined) updates.startDate = body.startDate
      if (body.endDate !== undefined) updates.endDate = body.endDate

      try {
        const [updated] = await db
          .update(schema.weeks)
          .set(updates)
          .where(eq(schema.weeks.id, week.id))
          .returning()
        return json(updated)
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('weeks_label_unique')) {
          return error('A week with that label already exists', 409)
        }
        throw err
      }
    }

    if (req.method === 'DELETE') {
      await db.delete(schema.weeks).where(eq(schema.weeks.id, week.id))
      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-weeks
  if (req.method === 'GET') {
    const weeks = await db
      .select()
      .from(schema.weeks)
      .orderBy(desc(schema.weeks.startDate))

    return json(weeks)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: [
    '/api/goals-weeks',
    '/api/goals-weeks/find-active',
    '/api/goals-weeks/:label',
    '/api/goals-weeks/:weekLabel/tasks',
    '/api/goals-weeks/:reorderLabel/reorder',
  ],
}
