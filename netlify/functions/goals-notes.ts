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

  const { id, noteId } = context.params

  // GET /api/goals-notes/:noteId/attachments
  if (noteId) {
    if (req.method !== 'GET') return methodNotAllowed()

    const noteAttachments = await db
      .select()
      .from(schema.attachments)
      .where(eq(schema.attachments.noteId, parseInt(noteId, 10)))

    return json(noteAttachments)
  }

  if (id) {
    const noteIdNum = parseInt(id, 10)

    // GET /api/goals-notes/:id
    if (req.method === 'GET') {
      const [note] = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.id, noteIdNum))
        .limit(1)

      if (!note) return notFound('Note not found')
      return json(note)
    }

    // PATCH /api/goals-notes/:id
    if (req.method === 'PATCH') {
      let body: { contentMarkdown?: string }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      const [existing] = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.id, noteIdNum))
        .limit(1)

      if (!existing) return notFound('Note not found')

      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (body.contentMarkdown !== undefined) {
        updates.contentMarkdown = body.contentMarkdown
        updates.contentHtml = await renderMarkdown(body.contentMarkdown)
      }

      const [updated] = await db
        .update(schema.notes)
        .set(updates)
        .where(eq(schema.notes.id, noteIdNum))
        .returning()

      return json(updated)
    }

    // DELETE /api/goals-notes/:id
    if (req.method === 'DELETE') {
      const [note] = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.id, noteIdNum))
        .limit(1)

      if (!note) return notFound('Note not found')

      await db.delete(schema.notes).where(eq(schema.notes.id, noteIdNum))
      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-notes
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const taskId = url.searchParams.get('taskId')
    const backlogItemId = url.searchParams.get('backlogItemId')

    let notes
    if (taskId) {
      notes = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.taskId, parseInt(taskId, 10)))
    } else if (backlogItemId) {
      notes = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.backlogItemId, parseInt(backlogItemId, 10)))
    } else {
      notes = await db.select().from(schema.notes)
    }

    return json(notes)
  }

  // POST /api/goals-notes
  if (req.method === 'POST') {
    let body: {
      taskId?: number | null
      backlogItemId?: number | null
      contentMarkdown: string
    }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.contentMarkdown) {
      return error('contentMarkdown is required')
    }

    if (!body.taskId && !body.backlogItemId) {
      return error('Either taskId or backlogItemId is required')
    }

    const contentHtml = await renderMarkdown(body.contentMarkdown)

    const [note] = await db
      .insert(schema.notes)
      .values({
        taskId: body.taskId || null,
        backlogItemId: body.backlogItemId || null,
        contentMarkdown: body.contentMarkdown,
        contentHtml,
      })
      .returning()

    return json(note, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: [
    '/api/goals-notes',
    '/api/goals-notes/:id',
    '/api/goals-notes/:noteId/attachments',
  ],
}
