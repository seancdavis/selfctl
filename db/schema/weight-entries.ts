import { pgTable, uuid, varchar, decimal, timestamp } from 'drizzle-orm/pg-core'

export const weightEntries = pgTable('weight_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  neonUserId: varchar('neon_user_id', { length: 255 }).notNull(),
  weight: decimal('weight', { precision: 5, scale: 1 }).notNull(),
  bodyFatPercentage: decimal('body_fat_percentage', { precision: 4, scale: 1 }),
  muscleMass: decimal('muscle_mass', { precision: 5, scale: 1 }),
  bmi: decimal('bmi', { precision: 4, scale: 1 }),
  recordedAt: timestamp('recorded_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
