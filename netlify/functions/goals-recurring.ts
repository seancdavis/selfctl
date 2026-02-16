import type { Config, Context } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { renderMarkdown } from './_shared/markdown.js'
import { requireAuth } from './_shared/auth.js'
import { logger } from './_shared/logger.js'

const log = logger('RECURRING')

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

      try {
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

        log.info('toggled task', { id: recurringId, isActive: updated.isActive })
        return json(updated)
      } catch (err) {
        log.error('toggle failed', { id: recurringId, error: String(err) })
        throw err
      }
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
        tags?: string[]
        isActive?: boolean
      }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      try {
        const [existing] = await db
          .select()
          .from(schema.recurringTasks)
          .where(eq(schema.recurringTasks.id, recurringId))
          .limit(1)

        if (!existing) return notFound('Recurring task not found')

        const updates: Record<string, unknown> = { updatedAt: new Date() }

        if (body.title !== undefined) updates.title = body.title
        if (body.categoryId !== undefined) updates.categoryId = body.categoryId
        if (body.tags !== undefined) updates.tags = body.tags
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

        log.info('updated task', { id: recurringId, fields: Object.keys(updates).filter(k => k !== 'updatedAt') })
        return json(updated)
      } catch (err) {
        log.error('update failed', { id: recurringId, error: String(err) })
        throw err
      }
    }

    // DELETE /api/goals-recurring/:id
    if (req.method === 'DELETE') {
      try {
        const [item] = await db
          .select()
          .from(schema.recurringTasks)
          .where(eq(schema.recurringTasks.id, recurringId))
          .limit(1)

        if (!item) return notFound('Recurring task not found')

        await db
          .delete(schema.recurringTasks)
          .where(eq(schema.recurringTasks.id, recurringId))

        log.info('deleted task', { id: recurringId, title: item.title })
        return json({ success: true })
      } catch (err) {
        log.error('delete failed', { id: recurringId, error: String(err) })
        throw err
      }
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

    try {
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
          tags: body.tags || [],
        })
        .returning()

      log.info('created task', { id: item.id, title: item.title })
      return json(item, 201)
    } catch (err) {
      log.error('create failed', { title: body.title, error: String(err) })
      throw err
    }
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
