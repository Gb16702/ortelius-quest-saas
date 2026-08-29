import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PricingCatalogPort, PricingIntelligenceRepositoryPort } from '../application/ports'
import type { PricingIntelligenceStats } from '../application/pricing-intelligence-models'
import {
  DeleteImportBatchUseCase,
  GenerateCsvTemplateUseCase,
  ImportPricingCsvUseCase,
  SuggestPricingUseCase,
} from '../application/pricing-intelligence-use-cases'

const catalog: PricingCatalogPort = {
  listOrganizationServices: mock(() =>
    Promise.resolve([
      { id: 'svc-1', name: 'Towage' },
      { id: 'svc-2', name: 'Pilotage' },
    ])
  ),
  listOrganizationCategories: mock(() => Promise.resolve([{ id: 'cat-1', name: 'General Cargo' }])),
  listServicesByIds: mock(() => Promise.resolve([{ id: 'svc-1', name: 'Towage' }])),
}

const stats: PricingIntelligenceStats = {
  totalTransactions: 0,
  totalImports: 0,
  services: [],
}

const repository: PricingIntelligenceRepositoryPort = {
  createImportBatch: mock(() => Promise.resolve()),
  deleteImportBatch: mock(() => Promise.resolve()),
  findImportBatch: mock(() =>
    Promise.resolve({
      id: 'batch-1',
      organizationId: 'org-123',
      fileName: 'prices.csv',
      rowCount: 1,
      errorCount: 0,
      errors: null,
      uploadedById: 'user-123',
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
    })
  ),
  getContextualStats: mock(() =>
    Promise.resolve([
      {
        tier: 'global',
        count: 20,
        avg: 1000,
        min: 800,
        max: 1200,
        stddev: 100,
        weightSlope: null,
        weightIntercept: null,
        weightCorr: null,
        volumeSlope: null,
        volumeIntercept: null,
        volumeCorr: null,
      },
    ])
  ),
  getStats: mock(() => Promise.resolve(stats)),
  insertHistoricalTransactions: mock(() => Promise.resolve()),
  listImportBatches: mock(() => Promise.resolve([])),
}

const ids = {
  values: ['batch-1', 'tx-1'],
  generate: mock(() => ids.values.shift() ?? 'fallback-id'),
}

describe('Pricing intelligence use cases', () => {
  beforeEach(() => {
    Object.values(catalog).forEach((fn) => fn.mockClear())
    Object.values(repository).forEach((fn) => fn.mockClear())
    ids.values = ['batch-1', 'tx-1']
    ids.generate.mockClear()
  })

  it('generates template CSV through catalog ports', async () => {
    const csv = await new GenerateCsvTemplateUseCase(catalog).execute({ organizationId: 'org-123' })

    expect(csv).toContain('Towage')
    expect(catalog.listOrganizationServices).toHaveBeenCalledWith('org-123')
    expect(catalog.listOrganizationCategories).toHaveBeenCalledWith('org-123')
  })

  it('imports CSV through catalog, repository, and id ports', async () => {
    const result = await new ImportPricingCsvUseCase(catalog, repository, ids).execute({
      organizationId: 'org-123',
      csvContent:
        'service_name,price,currency,cargo_categories,cargo_weight_kg,cargo_volume_m3,is_hazardous,is_reefer,is_oversized,transaction_date\nTowage,817,EUR,General Cargo,5000,200,0,0,0,2024-01-15',
      fileName: 'prices.csv',
      userId: 'user-123',
    })

    expect(result).toMatchObject({ batchId: 'batch-1', rowCount: 1, errorCount: 0 })
    expect(repository.createImportBatch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'batch-1', rowCount: 1, uploadedById: 'user-123' })
    )
    expect(repository.insertHistoricalTransactions).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'tx-1', serviceId: 'svc-1' }),
    ])
  })

  it('checks ownership before deleting import batches', async () => {
    await new DeleteImportBatchUseCase(repository).execute({
      batchId: 'batch-1',
      organizationId: 'org-123',
    })

    expect(repository.findImportBatch).toHaveBeenCalledWith('batch-1', 'org-123')
    expect(repository.deleteImportBatch).toHaveBeenCalledWith('batch-1', 'org-123')
  })

  it('suggests pricing through ports and pure domain calculation', async () => {
    const suggestions = await new SuggestPricingUseCase(catalog, repository).execute({
      organizationId: 'org-123',
      context: {
        serviceIds: ['svc-1'],
        cargoCategories: [],
        cargoWeight: null,
        cargoVolume: null,
        cargoIsHazardous: false,
        cargoIsReefer: false,
        cargoIsOversized: false,
      },
    })

    expect(suggestions[0]).toMatchObject({ serviceId: 'svc-1', suggestedPrice: 1000 })
    expect(repository.getContextualStats).toHaveBeenCalledWith(
      'org-123',
      'svc-1',
      expect.any(Object)
    )
  })
})
