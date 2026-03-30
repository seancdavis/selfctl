import { eq } from 'drizzle-orm'
import { db, schema } from './db.js'

/**
 * Validates that all tag names exist in the tags table for the given category.
 * Returns null if valid, or an error message string if invalid.
 */
export async function validateTags(
  tags: string[],
  categoryId: number | null,
): Promise<string | null> {
  if (tags.length === 0) return null

  if (!categoryId) {
    return 'tags require a categoryId'
  }

  const existingTags = await db
    .select({ name: schema.tags.name })
    .from(schema.tags)
    .where(eq(schema.tags.categoryId, categoryId))

  const existingNames = new Set(existingTags.map((t) => t.name))
  const invalidTags = tags.filter((t) => !existingNames.has(t))

  if (invalidTags.length > 0) {
    return `invalid tags: ${invalidTags.join(', ')}. Tags must already exist in the category before they can be applied.`
  }

  return null
}
