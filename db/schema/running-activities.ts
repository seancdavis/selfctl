import { pgTable, serial, bigint, varchar, decimal, integer, timestamp } from 'drizzle-orm/pg-core'

export const runningActivities = pgTable('running_activities', {
  id: serial('id').primaryKey(),
  stravaActivityId: bigint('strava_activity_id', { mode: 'bigint' }).notNull().unique(),
  name: varchar('name', { length: 500 }).notNull(),
  distanceMiles: decimal('distance_miles', { precision: 6, scale: 2 }).notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  movingTimeSeconds: integer('moving_time_seconds').notNull(),
  paceSecondsPerMile: integer('pace_seconds_per_mile').notNull(),
  elevationGainFeet: decimal('elevation_gain_feet', { precision: 7, scale: 1 }),
  activityDate: timestamp('activity_date').notNull(),
  stravaType: varchar('strava_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
