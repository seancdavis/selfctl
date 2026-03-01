import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core'

export const stravaTokens = pgTable('strava_tokens', {
  id: serial('id').primaryKey(),
  athleteId: integer('athlete_id').notNull().unique(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
