import type { Config, Context } from '@netlify/functions'
import { eq, sql } from 'drizzle-orm'
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
    // Handle orphaned tag operations
    if (id === 'orphaned') {
      // DELETE /api/goals-tags/orphaned — remove a tag name from all items
      if (req.method === 'DELETE') {
        let body: { tagName: string }
        try {
          body = await req.json()
        } catch {
          return error('Invalid JSON body')
        }

        if (!body.tagName) return error('tagName is required')

        await db.execute(
          sql`UPDATE tasks SET tags = array_remove(tags, ${body.tagName}) WHERE ${body.tagName} = ANY(tags)`,
        )
        await db.execute(
          sql`UPDATE backlog_items SET tags = array_remove(tags, ${body.tagName}) WHERE ${body.tagName} = ANY(tags)`,
        )
        await db.execute(
          sql`UPDATE recurring_tasks SET tags = array_remove(tags, ${body.tagName}) WHERE ${body.tagName} = ANY(tags)`,
        )

        return json({ success: true })
      }

      return methodNotAllowed()
    }

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

  // GET /api/goals-tags?categoryId=N or ?orphaned=true
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const categoryId = url.searchParams.get('categoryId')
    const orphaned = url.searchParams.get('orphaned')

    // Return tag names that exist on items but not in the tags table
    if (orphaned === 'true') {
      const allTasks = await db
        .select({ tags: schema.tasks.tags })
        .from(schema.tasks)
      const allBacklog = await db
        .select({ tags: schema.backlogItems.tags })
        .from(schema.backlogItems)
      const allRecurring = await db
        .select({ tags: schema.recurringTasks.tags })
        .from(schema.recurringTasks)

      const usedTags = new Set<string>()
      for (const item of [...allTasks, ...allBacklog, ...allRecurring]) {
        for (const tag of item.tags ?? []) {
          usedTags.add(tag)
        }
      }

      const definedTags = await db
        .select({ name: schema.tags.name })
        .from(schema.tags)
      const definedNames = new Set(definedTags.map((t) => t.name))

      const orphanedTags = [...usedTags]
        .filter((t) => !definedNames.has(t))
        .sort()
      return json(orphanedTags)
    }

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
