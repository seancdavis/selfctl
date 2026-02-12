import { pgTable, serial, varchar, decimal, timestamp } from 'drizzle-orm/pg-core'

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  neonUserId: varchar('neon_user_id', { length: 255 }).notNull().unique(),
  heightInches: decimal('height_inches', { precision: 4, scale: 1 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
