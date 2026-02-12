import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core'
import { tasks } from './tasks'
import { categories } from './categories'

export const followUps = pgTable('follow_ups', {
  id: serial('id').primaryKey(),
  sourceTaskId: integer('source_task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 500 }).notNull(),
  contentMarkdown: text('content_markdown'),
  contentHtml: text('content_html'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
