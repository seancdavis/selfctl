import { pgTable, serial, varchar, decimal, integer, text, timestamp } from 'drizzle-orm/pg-core'
import { runningActivities } from './running-activities'

export const races = pgTable('races', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  raceDate: varchar('race_date', { length: 10 }).notNull(),
  distanceLabel: varchar('distance_label', { length: 50 }).notNull(),
  distanceMiles: decimal('distance_miles', { precision: 6, scale: 2 }).notNull(),
  goalTimeSeconds: integer('goal_time_seconds'),
  actualTimeSeconds: integer('actual_time_seconds'),
  linkedActivityId: integer('linked_activity_id').references(
    () => runningActivities.id,
    { onDelete: 'set null' },
  ),
  notesMarkdown: text('notes_markdown'),
  notesHtml: text('notes_html'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
