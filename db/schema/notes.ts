import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { tasks } from './tasks'
import { backlogItems } from './backlog-items'

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  backlogItemId: integer('backlog_item_id').references(() => backlogItems.id, {
    onDelete: 'cascade',
  }),
  contentMarkdown: text('content_markdown').notNull(),
  contentHtml: text('content_html').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
