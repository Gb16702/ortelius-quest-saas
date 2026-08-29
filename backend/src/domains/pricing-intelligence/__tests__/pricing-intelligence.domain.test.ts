import { describe, expect, it } from 'bun:test'
import type { TieredStats } from '../application/pricing-intelligence-models'
import { buildCsvTemplateRows, parsePricingCsv } from '../domain/csv-import'
import { buildPriceSuggestions } from '../domain/pricing-suggestion'

const globalTier: TieredStats = {
  tier: 'global',
  count: 40,
  avg: 1000,
  min: 700,
  max: 1500,
  stddev: 100,
  weightSlope: null,
  weightIntercept: null,
  weightCorr: null,
  volumeSlope: null,
  volumeIntercept: null,
  volumeCorr: null,
}

describe('Pricing intelligence domain', () => {
  it('builds compatible CSV template content from organization catalog data', () => {
    const csv = buildCsvTemplateRows({
      services: [
        { id: 'svc-1', name: 'Towage' },
        { id: 'svc-2', name: 'Pilotage' },
      ],
      categories: [
        { id: 'cat-1', name: 'General Cargo' },
        { id: 'cat-2', name: 'Bulk Cargo' },
      ],
    })

    expect(csv.split('\n')[0]).toBe(
      'service_name,price,currency,cargo_categories,cargo_weight_kg,cargo_volume_m3,is_hazardous,is_reefer,is_oversized,transaction_date'
    )
    expect(csv).toContain('Towage,817,EUR,General Cargo,5000,200,0,0,0,2024-01-15')
  })

  it('parses CSV rows into historical transactions and reports row errors', () => {
    let nextId = 0
    const result = parsePricingCsv({
      organizationId: 'org-123',
      batchId: 'batch-123',
      csvContent:
        'service_name,price,currency,cargo_categories,cargo_weight_kg,cargo_volume_m3,is_hazardous,is_reefer,is_oversized,transaction_date\nTowage,817,EUR,General Cargo,5000,200,1,0,0,2024-01-15\nUnknown,10,EUR,,,,0,0,0,2024-01-16',
      services: [{ id: 'svc-1', name: 'Towage' }],
      now: new Date('2026-05-07T00:00:00.000Z'),
      generateId: () => `id-${++nextId}`,
    })

    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toMatchObject({
      id: 'id-1',
      organizationId: 'org-123',
      serviceId: 'svc-1',
      cargoIsHazardous: 1,
      importBatchId: 'batch-123',
    })
    expect(result.errors).toEqual([{ row: 3, message: 'Unknown service: "Unknown"' }])
  })

  it('builds suggestions from the best available contextual tier', () => {
    const suggestions = buildPriceSuggestions({
      context: {
        serviceIds: ['svc-1'],
        cargoCategories: ['General Cargo'],
        cargoWeight: null,
        cargoVolume: null,
        cargoIsHazardous: false,
        cargoIsReefer: false,
        cargoIsOversized: false,
      },
      serviceReferences: [{ id: 'svc-1', name: 'Towage' }],
      serviceTiers: [
        {
          serviceId: 'svc-1',
          tiers: [
            globalTier,
            {
              ...globalTier,
              tier: 'exact',
              count: 12,
              avg: 1200,
              min: 900,
              max: 1300,
            },
          ],
        },
      ],
    })

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      serviceId: 'svc-1',
      serviceName: 'Towage',
      suggestedPrice: 1075,
      stats: {
        transactionCount: 40,
        avgPrice: 1000,
      },
    })
  })
})
