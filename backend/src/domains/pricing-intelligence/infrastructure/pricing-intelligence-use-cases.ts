import {
  CaptureAcceptedQuoteUseCase,
  DeleteImportBatchUseCase,
  GenerateCsvTemplateUseCase,
  GetPricingIntelligenceStatsUseCase,
  ImportPricingCsvUseCase,
  ListImportBatchesUseCase,
  ResolveOrganizationForUserUseCase,
  SuggestPricingUseCase,
} from '../application/pricing-intelligence-use-cases'
import { DrizzleAcceptedQuoteTransactionAdapter } from './drizzle-accepted-quote-transaction.adapter'
import { DrizzleOrganizationMembershipAdapter } from './drizzle-organization-membership.adapter'
import { DrizzlePricingCatalogAdapter } from './drizzle-pricing-catalog.adapter'
import { DrizzlePricingIntelligenceRepository } from './drizzle-pricing-intelligence.repository'
import { NanoidIdGeneratorAdapter } from './nanoid-id-generator.adapter'

export function getPricingIntelligenceUseCases() {
  const catalog = new DrizzlePricingCatalogAdapter()
  const repository = new DrizzlePricingIntelligenceRepository()
  const ids = new NanoidIdGeneratorAdapter()
  const quoteTransactions = new DrizzleAcceptedQuoteTransactionAdapter()
  const membership = new DrizzleOrganizationMembershipAdapter()

  return {
    captureAcceptedQuote: new CaptureAcceptedQuoteUseCase(quoteTransactions, repository, ids),
    deleteImportBatch: new DeleteImportBatchUseCase(repository),
    generateCsvTemplate: new GenerateCsvTemplateUseCase(catalog),
    getStats: new GetPricingIntelligenceStatsUseCase(repository),
    importCsv: new ImportPricingCsvUseCase(catalog, repository, ids),
    listImportBatches: new ListImportBatchesUseCase(repository),
    resolveOrganizationForUser: new ResolveOrganizationForUserUseCase(membership),
    suggestPricing: new SuggestPricingUseCase(catalog, repository),
  }
}
