import { buildCsvTemplateRows, parsePricingCsv } from '../domain/csv-import'
import { buildPriceSuggestions } from '../domain/pricing-suggestion'
import type {
  AcceptedQuoteTransactionPort,
  IdGeneratorPort,
  OrganizationMembershipPort,
  PricingCatalogPort,
  PricingIntelligenceRepositoryPort,
} from './ports'
import type {
  ImportBatchRecord,
  ImportResult,
  PriceSuggestion,
  PricingIntelligenceStats,
  SuggestPricingRequest,
} from './pricing-intelligence-models'

export class GenerateCsvTemplateUseCase {
  constructor(private readonly catalog: PricingCatalogPort) {}

  async execute(input: { organizationId: string }): Promise<string> {
    const [services, categories] = await Promise.all([
      this.catalog.listOrganizationServices(input.organizationId),
      this.catalog.listOrganizationCategories(input.organizationId),
    ])

    return buildCsvTemplateRows({ services, categories })
  }
}

export class ImportPricingCsvUseCase {
  constructor(
    private readonly catalog: PricingCatalogPort,
    private readonly repository: PricingIntelligenceRepositoryPort,
    private readonly ids: IdGeneratorPort
  ) {}

  async execute(input: {
    organizationId: string
    csvContent: string
    fileName: string
    userId: string
  }): Promise<ImportResult> {
    const services = await this.catalog.listOrganizationServices(input.organizationId)
    const batchId = this.ids.generate()
    const now = new Date()
    const { errors, transactions } = parsePricingCsv({
      organizationId: input.organizationId,
      csvContent: input.csvContent,
      batchId,
      services,
      now,
      generateId: () => this.ids.generate(),
    })

    await this.repository.createImportBatch({
      id: batchId,
      organizationId: input.organizationId,
      fileName: input.fileName,
      rowCount: transactions.length,
      errorCount: errors.length,
      errors,
      uploadedById: input.userId,
      createdAt: now,
    })

    await this.repository.insertHistoricalTransactions(transactions)

    return {
      batchId,
      fileName: input.fileName,
      rowCount: transactions.length,
      errorCount: errors.length,
      errors,
    }
  }
}

export class ListImportBatchesUseCase {
  constructor(private readonly repository: PricingIntelligenceRepositoryPort) {}

  async execute(input: { organizationId: string }): Promise<ImportBatchRecord[]> {
    return await this.repository.listImportBatches(input.organizationId)
  }
}

export class DeleteImportBatchUseCase {
  constructor(private readonly repository: PricingIntelligenceRepositoryPort) {}

  async execute(input: { batchId: string; organizationId: string }): Promise<void> {
    const batch = await this.repository.findImportBatch(input.batchId, input.organizationId)
    if (!batch) {
      throw new Error('Import batch not found')
    }

    await this.repository.deleteImportBatch(input.batchId, input.organizationId)
  }
}

export class SuggestPricingUseCase {
  constructor(
    private readonly catalog: PricingCatalogPort,
    private readonly repository: PricingIntelligenceRepositoryPort
  ) {}

  async execute(input: {
    organizationId: string
    context: SuggestPricingRequest
  }): Promise<PriceSuggestion[]> {
    const [serviceReferences, serviceTiers] = await Promise.all([
      this.catalog.listServicesByIds(input.context.serviceIds),
      Promise.all(
        input.context.serviceIds.map(async (serviceId) => ({
          serviceId,
          tiers: await this.repository.getContextualStats(
            input.organizationId,
            serviceId,
            input.context
          ),
        }))
      ),
    ])

    return buildPriceSuggestions({
      context: input.context,
      serviceReferences,
      serviceTiers,
    })
  }
}

export class CaptureAcceptedQuoteUseCase {
  constructor(
    private readonly quoteTransactions: AcceptedQuoteTransactionPort,
    private readonly repository: PricingIntelligenceRepositoryPort,
    private readonly ids: IdGeneratorPort
  ) {}

  async execute(input: { quoteId: string; organizationId: string }): Promise<void> {
    const transactions = await this.quoteTransactions.loadAcceptedQuoteTransactions(
      input.quoteId,
      input.organizationId
    )

    if (transactions.length === 0) return

    const now = new Date()
    await this.repository.insertHistoricalTransactions(
      transactions.map((transaction) => ({
        ...transaction,
        id: this.ids.generate(),
        createdAt: now,
      }))
    )
  }
}

export class GetPricingIntelligenceStatsUseCase {
  constructor(private readonly repository: PricingIntelligenceRepositoryPort) {}

  async execute(input: { organizationId: string }): Promise<PricingIntelligenceStats> {
    return await this.repository.getStats(input.organizationId)
  }
}

export class ResolveOrganizationForUserUseCase {
  constructor(private readonly membership: OrganizationMembershipPort) {}

  async execute(input: { userId: string }): Promise<string | null> {
    return await this.membership.findOrganizationIdForUser(input.userId)
  }
}
