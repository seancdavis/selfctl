import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { categories } from './categories'
import { tasks } from './tasks'

export const backlogItems = pgTable('backlog_items', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 500 }).notNull(),
  contentMarkdown: text('content_markdown'),
  contentHtml: text('content_html'),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  priority: integer('priority').notNull().default(0),
  sourceTaskId: integer('source_task_id').references(() => tasks.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
