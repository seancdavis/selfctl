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

  if (id) {
    const followUpId = parseInt(id, 10)

    // GET /api/goals-follow-ups/:id
    if (req.method === 'GET') {
      const [result] = await db
        .select({
          followUp: schema.followUps,
          category: schema.categories,
        })
        .from(schema.followUps)
        .leftJoin(
          schema.categories,
          eq(schema.followUps.categoryId, schema.categories.id),
        )
        .where(eq(schema.followUps.id, followUpId))
        .limit(1)

      if (!result) return notFound('Follow-up not found')

      return json({ ...result.followUp, category: result.category })
    }

    // DELETE /api/goals-follow-ups/:id
    if (req.method === 'DELETE') {
      const [item] = await db
        .select()
        .from(schema.followUps)
        .where(eq(schema.followUps.id, followUpId))
        .limit(1)

      if (!item) return notFound('Follow-up not found')

      await db.delete(schema.followUps).where(eq(schema.followUps.id, followUpId))
      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-follow-ups
  if (req.method === 'GET') {
    const items = await db
      .select({
        followUp: schema.followUps,
        category: schema.categories,
      })
      .from(schema.followUps)
      .leftJoin(
        schema.categories,
        eq(schema.followUps.categoryId, schema.categories.id),
      )

    return json(
      items.map((row) => ({
        ...row.followUp,
        category: row.category,
      })),
    )
  }

  // POST /api/goals-follow-ups
  if (req.method === 'POST') {
    let body: {
      sourceTaskId: number
      categoryId?: number | null
      title: string
      contentMarkdown?: string | null
    }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.sourceTaskId || !body.title) {
      return error('sourceTaskId and title are required')
    }

    const contentHtml = body.contentMarkdown
      ? await renderMarkdown(body.contentMarkdown)
      : null

    const [item] = await db
      .insert(schema.followUps)
      .values({
        sourceTaskId: body.sourceTaskId,
        categoryId: body.categoryId || null,
        title: body.title,
        contentMarkdown: body.contentMarkdown || null,
        contentHtml,
      })
      .returning()

    return json(item, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: ['/api/goals-follow-ups', '/api/goals-follow-ups/:id'],
}
