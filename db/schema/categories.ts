import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  parentId: integer('parent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
