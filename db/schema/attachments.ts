import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { notes } from './notes'

export const attachments = pgTable('attachments', {
  id: serial('id').primaryKey(),
  noteId: integer('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  blobKey: varchar('blob_key', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
