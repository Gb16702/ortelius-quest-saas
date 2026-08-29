import type {
  ImportBatchRecord,
  ImportResult,
  PriceSuggestion,
  PricingIntelligenceStats,
  SuggestPricingRequest,
} from './application/pricing-intelligence-models'
import { getPricingIntelligenceUseCases } from './infrastructure/pricing-intelligence-use-cases'

export class PricingIntelligenceApplicationService {
  async generateCsvTemplate(organizationId: string): Promise<string> {
    const useCases = getPricingIntelligenceUseCases()
    return await useCases.generateCsvTemplate.execute({ organizationId })
  }

  async importCsv(
    organizationId: string,
    csvContent: string,
    fileName: string,
    userId: string
  ): Promise<ImportResult> {
    const useCases = getPricingIntelligenceUseCases()
    return await useCases.importCsv.execute({ organizationId, csvContent, fileName, userId })
  }

  async getImportBatches(organizationId: string): Promise<ImportBatchRecord[]> {
    const useCases = getPricingIntelligenceUseCases()
    return await useCases.listImportBatches.execute({ organizationId })
  }

  async deleteImportBatch(batchId: string, organizationId: string): Promise<void> {
    const useCases = getPricingIntelligenceUseCases()
    await useCases.deleteImportBatch.execute({ batchId, organizationId })
  }

  async suggestPricing(
    organizationId: string,
    context: SuggestPricingRequest
  ): Promise<PriceSuggestion[]> {
    const useCases = getPricingIntelligenceUseCases()
    return await useCases.suggestPricing.execute({ organizationId, context })
  }

  async captureFromAcceptedQuote(quoteId: string, organizationId: string): Promise<void> {
    const useCases = getPricingIntelligenceUseCases()
    await useCases.captureAcceptedQuote.execute({ quoteId, organizationId })
  }

  async getStats(organizationId: string): Promise<PricingIntelligenceStats> {
    const useCases = getPricingIntelligenceUseCases()
    return await useCases.getStats.execute({ organizationId })
  }

  async resolveOrganizationIdForUser(userId: string): Promise<string | null> {
    const useCases = getPricingIntelligenceUseCases()
    return await useCases.resolveOrganizationForUser.execute({ userId })
  }
}

export const pricingIntelligenceApplicationService = new PricingIntelligenceApplicationService()
