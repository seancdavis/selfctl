import type { Config, Context } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db, schema } from './_shared/db.js'
import { json, error, notFound, methodNotAllowed } from './_shared/response.js'
import { requireAuth } from './_shared/auth.js'

export default async (req: Request, context: Context) => {
  const auth = await requireAuth(req)
  if (!auth.authenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = context.params

  if (id) {
    const tagId = parseInt(id, 10)

    // DELETE /api/goals-tags/:id
    if (req.method === 'DELETE') {
      const [tag] = await db
        .select()
        .from(schema.tags)
        .where(eq(schema.tags.id, tagId))
        .limit(1)

      if (!tag) return notFound('Tag not found')

      await db.delete(schema.tags).where(eq(schema.tags.id, tagId))
      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-tags?categoryId=N
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const categoryId = url.searchParams.get('categoryId')

    if (categoryId) {
      const tags = await db
        .select()
        .from(schema.tags)
        .where(eq(schema.tags.categoryId, parseInt(categoryId, 10)))
      return json(tags)
    }

    const tags = await db.select().from(schema.tags)
    return json(tags)
  }

  // POST /api/goals-tags
  if (req.method === 'POST') {
    let body: { name: string; categoryId: number }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.name) return error('name is required')
    if (!body.categoryId) return error('categoryId is required')

    const [tag] = await db
      .insert(schema.tags)
      .values({
        name: body.name,
        categoryId: body.categoryId,
      })
      .returning()

    return json(tag, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: ['/api/goals-tags', '/api/goals-tags/:id'],
}
