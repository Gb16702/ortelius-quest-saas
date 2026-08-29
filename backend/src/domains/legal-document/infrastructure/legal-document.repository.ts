import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { user } from '../../../infrastructure/database/db/schemas/auth-schema'
import { legalDocument } from '../../../infrastructure/database/db/schemas/legal-document-schema'
import type { LegalDocument, LegalDocumentRow } from '../application/legal-document-models'
import { legalDocumentRowToDto } from '../application/legal-document-models'
import type { LegalDocumentRepositoryPort } from '../application/ports'

export class DrizzleLegalDocumentRepository implements LegalDocumentRepositoryPort {
  async listForOrganization(organizationId: string): Promise<{
    documents: LegalDocument[]
    totalSizeBytes: number
  }> {
    const rows = await db
      .select({
        id: legalDocument.id,
        organizationId: legalDocument.organizationId,
        label: legalDocument.label,
        s3Key: legalDocument.s3Key,
        sizeBytes: legalDocument.sizeBytes,
        mimeType: legalDocument.mimeType,
        originalFilename: legalDocument.originalFilename,
        scanStatus: legalDocument.scanStatus,
        scanCompletedAt: legalDocument.scanCompletedAt,
        uploadedById: legalDocument.uploadedById,
        uploadedByName: user.name,
        createdAt: legalDocument.createdAt,
        updatedAt: legalDocument.updatedAt,
      })
      .from(legalDocument)
      .leftJoin(user, eq(user.id, legalDocument.uploadedById))
      .where(and(eq(legalDocument.organizationId, organizationId), isNull(legalDocument.deletedAt)))
      .orderBy(desc(legalDocument.createdAt))

    const documents = rows.map(legalDocumentRowToDto)
    const totalSizeBytes = rows.reduce((acc, r) => acc + r.sizeBytes, 0)
    return { documents, totalSizeBytes }
  }

  async getById(documentId: string, organizationId: string): Promise<LegalDocumentRow | null> {
    const [row] = await db
      .select({
        id: legalDocument.id,
        organizationId: legalDocument.organizationId,
        label: legalDocument.label,
        s3Key: legalDocument.s3Key,
        sizeBytes: legalDocument.sizeBytes,
        mimeType: legalDocument.mimeType,
        originalFilename: legalDocument.originalFilename,
        scanStatus: legalDocument.scanStatus,
        scanCompletedAt: legalDocument.scanCompletedAt,
        uploadedById: legalDocument.uploadedById,
        uploadedByName: user.name,
        createdAt: legalDocument.createdAt,
        updatedAt: legalDocument.updatedAt,
      })
      .from(legalDocument)
      .leftJoin(user, eq(user.id, legalDocument.uploadedById))
      .where(
        and(
          eq(legalDocument.id, documentId),
          eq(legalDocument.organizationId, organizationId),
          isNull(legalDocument.deletedAt)
        )
      )
      .limit(1)

    return row ?? null
  }

  async getCumulativeSize(organizationId: string): Promise<number> {
    const [result] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${legalDocument.sizeBytes}), 0)`,
      })
      .from(legalDocument)
      .where(and(eq(legalDocument.organizationId, organizationId), isNull(legalDocument.deletedAt)))

    return result ? Number(result.total) : 0
  }

  async insert(input: {
    organizationId: string
    label: string
    s3Key: string
    sizeBytes: number
    originalFilename: string
    uploadedById: string
  }): Promise<LegalDocumentRow> {
    const [inserted] = await db
      .insert(legalDocument)
      .values({
        organizationId: input.organizationId,
        label: input.label,
        s3Key: input.s3Key,
        sizeBytes: input.sizeBytes,
        mimeType: 'application/pdf',
        originalFilename: input.originalFilename,
        scanStatus: 'clean',
        uploadedById: input.uploadedById,
      })
      .returning()

    if (!inserted) {
      throw new Error('Failed to insert legal document')
    }

    const fresh = await this.getById(inserted.id, input.organizationId)
    if (!fresh) {
      throw new Error('Failed to read back inserted legal document')
    }
    return fresh
  }

  async updateLabel(
    documentId: string,
    organizationId: string,
    label: string
  ): Promise<LegalDocumentRow | null> {
    const [updated] = await db
      .update(legalDocument)
      .set({ label, updatedAt: new Date() })
      .where(
        and(
          eq(legalDocument.id, documentId),
          eq(legalDocument.organizationId, organizationId),
          isNull(legalDocument.deletedAt)
        )
      )
      .returning({ id: legalDocument.id })

    if (!updated) {
      return null
    }

    return this.getById(updated.id, organizationId)
  }

  async deleteById(documentId: string, organizationId: string): Promise<{ deleted: boolean }> {
    // Soft-delete only. Rows are never hard-deleted and S3 objects are never
    // removed — historical quotes carry snapshot rows that must keep
    // resolving via presigned URLs derived from the original s3_key.
    const [updated] = await db
      .update(legalDocument)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(legalDocument.id, documentId),
          eq(legalDocument.organizationId, organizationId),
          isNull(legalDocument.deletedAt)
        )
      )
      .returning({ id: legalDocument.id })

    return { deleted: Boolean(updated) }
  }

  async getActiveByIdsForOrg(
    documentIds: string[],
    organizationId: string
  ): Promise<
    Array<{
      id: string
      label: string
      originalFilename: string
      sizeBytes: number
      s3Key: string
    }>
  > {
    if (documentIds.length === 0) {
      return []
    }
    const rows = await db
      .select({
        id: legalDocument.id,
        label: legalDocument.label,
        originalFilename: legalDocument.originalFilename,
        sizeBytes: legalDocument.sizeBytes,
        s3Key: legalDocument.s3Key,
      })
      .from(legalDocument)
      .where(
        and(
          eq(legalDocument.organizationId, organizationId),
          isNull(legalDocument.deletedAt),
          inArray(legalDocument.id, documentIds)
        )
      )
    return rows
  }

  async countActiveForOrganization(organizationId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<string>`count(*)` })
      .from(legalDocument)
      .where(and(eq(legalDocument.organizationId, organizationId), isNull(legalDocument.deletedAt)))
    return result ? Number(result.count) : 0
  }

  rowToDto(row: LegalDocumentRow): LegalDocument {
    return legalDocumentRowToDto(row)
  }
}

export const legalDocumentRepository = new DrizzleLegalDocumentRepository()
