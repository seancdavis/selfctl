import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core'

export const weeks = pgTable('weeks', {
  id: varchar('id', { length: 7 }).primaryKey(), // "2026-05" format
  startDate: varchar('start_date', { length: 10 }).notNull(), // "2026-01-27"
  endDate: varchar('end_date', { length: 10 }).notNull(), // "2026-02-02"
  totalTasks: integer('total_tasks').notNull().default(0),
  completedTasks: integer('completed_tasks').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
