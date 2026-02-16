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
    const categoryId = parseInt(id, 10)

    // GET /api/goals-categories/:id
    if (req.method === 'GET') {
      const [category] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .limit(1)

      if (!category) return notFound('Category not found')
      return json(category)
    }

    // PATCH /api/goals-categories/:id
    if (req.method === 'PATCH') {
      let body: { name?: string; description?: string | null; parentId?: number | null }
      try {
        body = await req.json()
      } catch {
        return error('Invalid JSON body')
      }

      const [existing] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .limit(1)

      if (!existing) return notFound('Category not found')

      const updates: Record<string, unknown> = {}
      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description
      if (body.parentId !== undefined) updates.parentId = body.parentId

      const [updated] = await db
        .update(schema.categories)
        .set(updates)
        .where(eq(schema.categories.id, categoryId))
        .returning()

      return json(updated)
    }

    // DELETE /api/goals-categories/:id
    if (req.method === 'DELETE') {
      const [category] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .limit(1)

      if (!category) return notFound('Category not found')

      await db.delete(schema.categories).where(eq(schema.categories.id, categoryId))
      return json({ success: true })
    }

    return methodNotAllowed()
  }

  // GET /api/goals-categories
  if (req.method === 'GET') {
    const categories = await db.select().from(schema.categories)
    return json(categories)
  }

  // POST /api/goals-categories
  if (req.method === 'POST') {
    let body: { name: string; description?: string | null; parentId?: number | null }
    try {
      body = await req.json()
    } catch {
      return error('Invalid JSON body')
    }

    if (!body.name) {
      return error('name is required')
    }

    const [category] = await db
      .insert(schema.categories)
      .values({
        name: body.name,
        description: body.description || null,
        parentId: body.parentId || null,
      })
      .returning()

    return json(category, 201)
  }

  return methodNotAllowed()
}

export const config: Config = {
  path: ['/api/goals-categories', '/api/goals-categories/:id'],
}
