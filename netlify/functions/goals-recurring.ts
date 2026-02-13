import type { Config, Context } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { renderMarkdown } from './_shared/markdown.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]

  if (id) {
    const recurringId = parseInt(id, 10)

    // POST /api/goals-recurring/:id/toggle
    if (lastSegment === 'toggle') {
      if (req.method !== 'POST') return methodNotAllowed()

      const [item] = await db
        .select()
        .from(schema.recurringTasks)
        .where(eq(schema.recurringTasks.id, recurringId))
        .limit(1)

      if (!item) return notFound('Recurring task not found')

      const [updated] = await db
        .update(schema.recurringTasks)
        .set({ isActive: !item.isActive, updatedAt: new Date() })
        .where(eq(schema.recurringTasks.id, recurringId))
        .returning()

      return json(updated)
    }

    // GET /api/goals-recurring/:id
    if (req.method === 'GET') {
      const [item] = await db
        .select()
        .from(schema.recurringTasks)
        .where(eq(schema.recurringTasks.id, recurringId))
        .limit(1)

      if (!item) return notFound('Recurring task not found')
      return json(item)
    }

    // PATCH /api/goals-recurring/:id
    if (req.method === 'PATCH') {
      let body: {
        title?: string
        categoryId?: number | null
        contentMarkdown?: string | null
        isActive?: boolean
      }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      const [existing] = await db
        .select()
        .from(schema.recurringTasks)
        .where(eq(schema.recurringTasks.id, recurringId))
        .limit(1)

      if (!existing) return notFound('Recurring task not found')

      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (body.title !== undefined) updates.title = body.title
      if (body.categoryId !== undefined) updates.categoryId = body.categoryId
      if (body.isActive !== undefined) updates.isActive = body.isActive
      if (body.contentMarkdown !== undefined) {
        updates.contentMarkdown = body.contentMarkdown
        updates.contentHtml = body.contentMarkdown
          ? await renderMarkdown(body.contentMarkdown)
          : null
      }

      const [updated] = await db
        .update(schema.recurringTasks)
        .set(updates)
        .where(eq(schema.recurringTasks.id, recurringId))
        .returning()

      return json(updated)
    }

    // DELETE /api/goals-recurring/:id
    if (req.method === 'DELETE') {
      const [item] = await db
        .select()
        .from(schema.recurringTasks)
        .where(eq(schema.recurringTasks.id, recurringId))
        .limit(1)

      if (!item) return notFound('Recurring task not found')

      await db
        .delete(schema.recurringTasks)
        .where(eq(schema.recurringTasks.id, recurringId))

      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-recurring
  if (req.method === 'GET') {
    const items = await db.select().from(schema.recurringTasks)
    return json(items)
  }

  // POST /api/goals-recurring
  if (req.method === 'POST') {
    let body: {
      title: string
      categoryId?: number | null
      contentMarkdown?: string | null
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
      .insert(schema.recurringTasks)
      .values({
        title: body.title,
        categoryId: body.categoryId || null,
        contentMarkdown: body.contentMarkdown || null,
        contentHtml,
      })
      .returning()

    return json(item, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: [
    '/api/goals-recurring',
    '/api/goals-recurring/:id',
    '/api/goals-recurring/:id/toggle',
  ],
}
