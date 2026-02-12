import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { categories } from './categories'

export const recurringTasks = pgTable('recurring_tasks', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 500 }).notNull(),
  contentMarkdown: text('content_markdown'),
  contentHtml: text('content_html'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
