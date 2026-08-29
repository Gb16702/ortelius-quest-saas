import { eq } from 'drizzle-orm'
import { db, organization } from '../../../infrastructure/database'
import {
  ERequestLifecycleStatus,
  request,
} from '../../../infrastructure/database/db/schemas/request-schema'
import type { InboundOrganizationPort, InboundRequestPort } from '../application/ports'
import type { DraftRequestRecord, InboundOrganization } from '../application/webhook-models'

export class DrizzleWebhookRepository implements InboundOrganizationPort, InboundRequestPort {
  async getOrganizationBySlug(slug: string): Promise<InboundOrganization | null> {
    const result = await db
      .select({
        id: organization.id,
        slug: organization.slug,
        emailIntakeEnabled: organization.emailIntakeEnabled,
      })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1)

    const row = result[0]
    if (!row?.slug) return null

    return {
      id: row.id,
      slug: row.slug,
      emailIntakeEnabled: row.emailIntakeEnabled,
    }
  }

  async existsBySourceEmailId(messageId: string): Promise<boolean> {
    const existing = await db
      .select({ id: request.id })
      .from(request)
      .where(eq(request.sourceEmailId, messageId))
      .limit(1)

    return existing.length > 0
  }

  async createDraftRequest(record: DraftRequestRecord): Promise<void> {
    await db.insert(request).values({
      id: record.id,
      reqNumber: record.reqNumber,
      lifecycleStatus: ERequestLifecycleStatus.DRAFT,
      closedReason: null,
      requesterEmail: record.requesterEmail,
      requesterName: record.requesterName,
      requesterPhone: record.requesterPhone,
      receiverOrganizationId: record.receiverOrganizationId,
      categories: record.categories,
      services: record.services,
      extraServices: record.extraServices,
      comments: record.comments,
      fromDate: record.fromDate,
      toDate: record.toDate,
      sourceEmailId: record.sourceEmailId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }
}
