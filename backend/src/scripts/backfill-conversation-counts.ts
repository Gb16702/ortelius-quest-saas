import { and, eq, sql } from 'drizzle-orm'
import { db } from '../infrastructure/database'
import { conversation, message } from '../infrastructure/database/db/schemas/chat-schema'
import { memberMetrics } from '../infrastructure/database/db/schemas/metrics-schema'

async function backfillConversationCounts() {
  try {
    console.log('Starting conversation counts backfill...')

    const conversationCounts = await db
      .select({
        senderId: message.senderId,
        organizationId: conversation.organizationId,
        conversationCount: sql<number>`count(distinct ${message.conversationId})`.as(
          'conversationCount'
        ),
      })
      .from(message)
      .innerJoin(conversation, eq(message.conversationId, conversation.id))
      .where(sql`${conversation.organizationId} is not null`)
      .groupBy(message.senderId, conversation.organizationId)

    console.log(`Found ${conversationCounts.length} member-organization combinations to update`)

    let updated = 0
    let skipped = 0

    for (const record of conversationCounts) {
      const existing = await db
        .select()
        .from(memberMetrics)
        .where(
          and(
            eq(memberMetrics.userId, record.senderId),
            eq(memberMetrics.organizationId, record.organizationId)
          )
        )
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(memberMetrics)
          .set({
            conversationsCount: record.conversationCount,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(memberMetrics.userId, record.senderId),
              eq(memberMetrics.organizationId, record.organizationId)
            )
          )
        updated++
        console.log(
          `Updated user ${record.senderId} in org ${record.organizationId}: ${record.conversationCount} conversations`
        )
      } else {
        console.log(
          `No member metrics record found for user ${record.senderId} in org ${record.organizationId}, skipping`
        )
        skipped++
      }
    }

    console.log(`Backfill completed: ${updated} updated, ${skipped} skipped`)
  } catch (error) {
    console.error('Error during conversation counts backfill:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  backfillConversationCounts()
    .then(() => {
      console.log('Conversation counts backfill completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { backfillConversationCounts }
