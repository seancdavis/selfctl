import type { Config, Context } from '@netlify/functions'
import { eq, desc } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { renderMarkdown } from './_shared/markdown.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, backlogItemId } = context.params
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]

  // GET /api/goals-backlog/:backlogItemId/notes
  if (backlogItemId) {
    if (req.method !== 'GET') return methodNotAllowed()

    const itemNotes = await db
      .select()
      .from(schema.notes)
      .where(eq(schema.notes.backlogItemId, parseInt(backlogItemId, 10)))

    return json(itemNotes)
  }

  if (id) {
    const itemId = parseInt(id, 10)

    // POST /api/goals-backlog/:id/to-week
    if (lastSegment === 'to-week') {
      if (req.method !== 'POST') return methodNotAllowed()

      let body: { weekId: string }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      if (!body.weekId) {
        return error('weekId is required')
      }

      const [item] = await db
        .select()
        .from(schema.backlogItems)
        .where(eq(schema.backlogItems.id, itemId))
        .limit(1)

      if (!item) return notFound('Backlog item not found')

      // Create task from backlog item
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

      // Copy notes from backlog item to new task
      const itemNotes = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.backlogItemId, itemId))

      for (const note of itemNotes) {
        await db.insert(schema.notes).values({
          taskId: task.id,
          contentMarkdown: note.contentMarkdown,
          contentHtml: note.contentHtml,
        })
      }

      // Delete backlog item (cascade deletes its notes)
      await db.delete(schema.backlogItems).where(eq(schema.backlogItems.id, itemId))

      // Update week stats
      const weekTasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.weekId, body.weekId))

      await db
        .update(schema.weeks)
        .set({
          totalTasks: weekTasks.length,
          completedTasks: weekTasks.filter((t) => t.status === 'completed').length,
          updatedAt: new Date(),
        })
        .where(eq(schema.weeks.id, body.weekId))

      return json(task, 201)
    }

    // GET /api/goals-backlog/:id
    if (req.method === 'GET') {
      const [result] = await db
        .select({
          backlogItem: schema.backlogItems,
          category: schema.categories,
        })
        .from(schema.backlogItems)
        .leftJoin(
          schema.categories,
          eq(schema.backlogItems.categoryId, schema.categories.id),
        )
        .where(eq(schema.backlogItems.id, itemId))
        .limit(1)

      if (!result) return notFound('Backlog item not found')

      return json({ ...result.backlogItem, category: result.category })
    }

    // PATCH /api/goals-backlog/:id
    if (req.method === 'PATCH') {
      let body: {
        title?: string
        categoryId?: number | null
        contentMarkdown?: string | null
        tags?: string[]
        priority?: number
      }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      const [existing] = await db
        .select()
        .from(schema.backlogItems)
        .where(eq(schema.backlogItems.id, itemId))
        .limit(1)

      if (!existing) return notFound('Backlog item not found')

      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (body.title !== undefined) updates.title = body.title
      if (body.categoryId !== undefined) updates.categoryId = body.categoryId
      if (body.tags !== undefined) updates.tags = body.tags
      if (body.priority !== undefined) updates.priority = body.priority
      if (body.contentMarkdown !== undefined) {
        updates.contentMarkdown = body.contentMarkdown
        updates.contentHtml = body.contentMarkdown
          ? await renderMarkdown(body.contentMarkdown)
          : null
      }

      const [updated] = await db
        .update(schema.backlogItems)
        .set(updates)
        .where(eq(schema.backlogItems.id, itemId))
        .returning()

      return json(updated)
    }

    // DELETE /api/goals-backlog/:id
    if (req.method === 'DELETE') {
      const [item] = await db
        .select()
        .from(schema.backlogItems)
        .where(eq(schema.backlogItems.id, itemId))
        .limit(1)

      if (!item) return notFound('Backlog item not found')

      await db.delete(schema.backlogItems).where(eq(schema.backlogItems.id, itemId))
      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-backlog
  if (req.method === 'GET') {
    const items = await db
      .select({
        backlogItem: schema.backlogItems,
        category: schema.categories,
      })
      .from(schema.backlogItems)
      .leftJoin(
        schema.categories,
        eq(schema.backlogItems.categoryId, schema.categories.id),
      )
      .orderBy(desc(schema.backlogItems.priority))

    return json(
      items.map((row) => ({
        ...row.backlogItem,
        category: row.category,
      })),
    )
  }

  // POST /api/goals-backlog
  if (req.method === 'POST') {
    let body: {
      title: string
      categoryId?: number | null
      contentMarkdown?: string | null
      tags?: string[]
      priority?: number
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
        priority: body.priority ?? 0,
      })
      .returning()

    return json(item, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: [
    '/api/goals-backlog',
    '/api/goals-backlog/:id',
    '/api/goals-backlog/:id/to-week',
    '/api/goals-backlog/:backlogItemId/notes',
  ],
}
