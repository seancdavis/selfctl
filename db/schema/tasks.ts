import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { weeks } from './weeks'
import { categories } from './categories'

export const taskStatusEnum = pgEnum('task_status', ['pending', 'completed'])

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  weekId: varchar('week_id', { length: 7 })
    .notNull()
    .references(() => weeks.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 500 }).notNull(),
  contentMarkdown: text('content_markdown'),
  contentHtml: text('content_html'),
  status: taskStatusEnum('status').notNull().default('pending'),
  isRecurring: boolean('is_recurring').notNull().default(false),
  stalenessCount: integer('staleness_count').notNull().default(0),
  previousVersionId: integer('previous_version_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
