import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { conversation } from './chat-schema'

export const transcript = pgTable('transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: text('call_id').notNull(),
  conversationId: uuid('conversation_id')
    .references(() => conversation.id, { onDelete: 'cascade' })
    .notNull(),
  audioKey: text('audio_key').notNull(),
  text: text('text').notNull(),
  segments: text('segments'),
  summaryKey: text('summary_key'),
  pdfUrl: text('pdf_url'),
  recordingUrl: text('recording_url'),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default(
    'pending'
  ),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
