import { and, count, eq, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import {
  historicalTransaction,
  importBatch,
  type NewHistoricalTransaction,
} from '../../../infrastructure/database/db/schemas/pricing-intelligence-schema'
import { service } from '../../../infrastructure/database/db/schemas/services-schema'
import type { PricingIntelligenceRepositoryPort } from '../application/ports'
import type {
  HistoricalTransactionInput,
  ImportBatchRecord,
  PricingIntelligenceStats,
  SuggestPricingRequest,
  TieredStats,
  TierName,
} from '../application/pricing-intelligence-models'
import { DECAY_HALF_LIFE_DAYS } from '../domain/pricing-suggestion'

export class DrizzlePricingIntelligenceRepository implements PricingIntelligenceRepositoryPort {
  async createImportBatch(input: {
    id: string
    organizationId: string
    fileName: string
    rowCount: number
    errorCount: number
    errors: Array<{ row: number; message: string }>
    uploadedById: string
    createdAt: Date
  }): Promise<void> {
    await db.insert(importBatch).values({
      id: input.id,
      organizationId: input.organizationId,
      fileName: input.fileName,
      rowCount: input.rowCount,
      errorCount: input.errorCount,
      errors: input.errors.length > 0 ? input.errors : null,
      uploadedById: input.uploadedById,
      createdAt: input.createdAt,
    })
  }

  async insertHistoricalTransactions(transactions: HistoricalTransactionInput[]): Promise<void> {
    if (transactions.length === 0) return

    const chunkSize = 500
    for (let index = 0; index < transactions.length; index += chunkSize) {
      await db
        .insert(historicalTransaction)
        .values(transactions.slice(index, index + chunkSize) as NewHistoricalTransaction[])
    }
  }

  async listImportBatches(organizationId: string): Promise<ImportBatchRecord[]> {
    return await db
      .select()
      .from(importBatch)
      .where(eq(importBatch.organizationId, organizationId))
      .orderBy(sql`${importBatch.createdAt} DESC`)
  }

  async findImportBatch(
    batchId: string,
    organizationId: string
  ): Promise<ImportBatchRecord | null> {
    const [batch] = await db
      .select()
      .from(importBatch)
      .where(and(eq(importBatch.id, batchId), eq(importBatch.organizationId, organizationId)))
      .limit(1)

    return batch ?? null
  }

  async deleteImportBatch(batchId: string, organizationId: string): Promise<void> {
    await db
      .delete(importBatch)
      .where(and(eq(importBatch.id, batchId), eq(importBatch.organizationId, organizationId)))
  }

  async getStats(organizationId: string): Promise<PricingIntelligenceStats> {
    const [totalResult] = await db
      .select({ total: count() })
      .from(historicalTransaction)
      .where(eq(historicalTransaction.organizationId, organizationId))

    const [importsResult] = await db
      .select({ total: count() })
      .from(importBatch)
      .where(eq(importBatch.organizationId, organizationId))

    const serviceStats = await db
      .select({
        serviceId: historicalTransaction.serviceId,
        serviceName: service.name,
        transactionCount: count(),
        avgPrice: sql<number>`AVG(${historicalTransaction.price})`,
      })
      .from(historicalTransaction)
      .innerJoin(service, eq(historicalTransaction.serviceId, service.id))
      .where(eq(historicalTransaction.organizationId, organizationId))
      .groupBy(historicalTransaction.serviceId, service.name)

    return {
      totalTransactions: totalResult.total,
      totalImports: importsResult.total,
      services: serviceStats.map((stat) => ({
        serviceId: stat.serviceId,
        serviceName: stat.serviceName,
        transactionCount: Number(stat.transactionCount),
        avgPrice: stat.avgPrice ? Number(stat.avgPrice) : null,
      })),
    }
  }

  async getContextualStats(
    organizationId: string,
    serviceId: string,
    context: SuggestPricingRequest
  ): Promise<TieredStats[]> {
    const hazardous = context.cargoIsHazardous ? 1 : 0
    const reefer = context.cargoIsReefer ? 1 : 0
    const oversized = context.cargoIsOversized ? 1 : 0
    const categories = context.cargoCategories

    const hasCategories = categories.length > 0
    const hasSpecialFlags = hazardous === 1 || reefer === 1 || oversized === 1
    const decayLambda = Math.LN2 / DECAY_HALF_LIFE_DAYS

    const rows = await db.execute<{
      tier: TierName
      count: string
      avg: string | null
      min: string | null
      max: string | null
      stddev: string | null
      weight_slope: string | null
      weight_intercept: string | null
      weight_corr: string | null
      volume_slope: string | null
      volume_intercept: string | null
      volume_corr: string | null
    }>(sql`
      WITH
        raw_data AS (
          SELECT price, cargo_weight, cargo_volume, transaction_date,
                 cargo_is_hazardous, cargo_is_reefer, cargo_is_oversized, cargo_categories
          FROM historical_transaction
          WHERE organization_id = ${organizationId}
            AND service_id = ${serviceId}
        ),
        iqr_bounds AS (
          SELECT
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price) AS q1,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price) AS q3
          FROM raw_data
        ),
        filtered AS (
          SELECT r.*,
                 EXP(${-decayLambda} * EXTRACT(EPOCH FROM (NOW() - r.transaction_date)) / 86400) AS w
          FROM raw_data r, iqr_bounds b
          WHERE r.price BETWEEN
            COALESCE(b.q1 - 1.5 * (b.q3 - b.q1), r.price) AND
            COALESCE(b.q3 + 1.5 * (b.q3 - b.q1), r.price)
        ),
        classified AS (
          SELECT *,
            CASE
              WHEN cargo_is_hazardous = ${hazardous}
                AND cargo_is_reefer = ${reefer}
                AND cargo_is_oversized = ${oversized}
                ${
                  hasCategories
                    ? sql`AND cargo_categories::jsonb ?| ${sql`ARRAY[${sql.join(
                        categories.map((category) => sql`${category}`),
                        sql`, `
                      )}]`}`
                    : sql``
                }
              THEN 'exact'
              WHEN cargo_is_hazardous = ${hazardous}
                AND cargo_is_reefer = ${reefer}
                AND cargo_is_oversized = ${oversized}
              THEN 'flags'
              WHEN ${
                hasSpecialFlags
                  ? sql`(
                (${hazardous} = 1 AND cargo_is_hazardous = 1) OR
                (${reefer} = 1 AND cargo_is_reefer = 1) OR
                (${oversized} = 1 AND cargo_is_oversized = 1)
              )`
                  : sql`(cargo_is_hazardous = 0 AND cargo_is_reefer = 0 AND cargo_is_oversized = 0)`
              }
              THEN 'partial'
            END AS tier
          FROM filtered
        )
      SELECT
        tier,
        COUNT(*)::text AS count,
        (SUM(price * w) / SUM(w))::text AS avg,
        MIN(price)::text AS min,
        MAX(price)::text AS max,
        COALESCE(SQRT(GREATEST(0, SUM(w * price * price) / SUM(w) - POW(SUM(w * price) / SUM(w), 2))), 0)::text AS stddev,
        REGR_SLOPE(price, cargo_weight)::text AS weight_slope,
        REGR_INTERCEPT(price, cargo_weight)::text AS weight_intercept,
        CORR(price, cargo_weight)::text AS weight_corr,
        REGR_SLOPE(price, cargo_volume)::text AS volume_slope,
        REGR_INTERCEPT(price, cargo_volume)::text AS volume_intercept,
        CORR(price, cargo_volume)::text AS volume_corr
      FROM classified
      WHERE tier IS NOT NULL
      GROUP BY tier

      UNION ALL

      SELECT
        'global'::text AS tier,
        COUNT(*)::text AS count,
        (SUM(price * w) / SUM(w))::text AS avg,
        MIN(price)::text AS min,
        MAX(price)::text AS max,
        COALESCE(SQRT(GREATEST(0, SUM(w * price * price) / SUM(w) - POW(SUM(w * price) / SUM(w), 2))), 0)::text AS stddev,
        REGR_SLOPE(price, cargo_weight)::text AS weight_slope,
        REGR_INTERCEPT(price, cargo_weight)::text AS weight_intercept,
        CORR(price, cargo_weight)::text AS weight_corr,
        REGR_SLOPE(price, cargo_volume)::text AS volume_slope,
        REGR_INTERCEPT(price, cargo_volume)::text AS volume_intercept,
        CORR(price, cargo_volume)::text AS volume_corr
      FROM filtered
    `)

    const parseNum = (value: string | null): number | null =>
      value !== null && value !== '' ? Number(value) : null

    return rows.rows.map((row) => ({
      tier: row.tier,
      count: Number(row.count),
      avg: Number(row.avg ?? 0),
      min: Number(row.min ?? 0),
      max: Number(row.max ?? 0),
      stddev: Number(row.stddev ?? 0),
      weightSlope: parseNum(row.weight_slope),
      weightIntercept: parseNum(row.weight_intercept),
      weightCorr: parseNum(row.weight_corr),
      volumeSlope: parseNum(row.volume_slope),
      volumeIntercept: parseNum(row.volume_intercept),
      volumeCorr: parseNum(row.volume_corr),
    }))
  }
}
