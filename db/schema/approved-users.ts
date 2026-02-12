import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core'

export const approvedUsers = pgTable('approved_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  neonUserId: varchar('neon_user_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
