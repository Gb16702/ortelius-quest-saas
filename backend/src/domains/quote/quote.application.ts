import type { QuoteCreateData, QuoteRecord, QuoteUpdateData } from './application/ports'
import { getQuoteUseCases } from './infrastructure/quote-use-cases'

export class QuoteApplicationService {
  private async getUseCases() {
    return await getQuoteUseCases()
  }

  async createAndSendQuote(data: QuoteCreateData, actorId: string): Promise<QuoteRecord> {
    const useCases = await this.getUseCases()
    return await useCases.createAndSend.execute({ data, actorId })
  }

  async getQuoteById(quoteId: string): Promise<QuoteRecord & { legalDocuments: unknown[] }> {
    const useCases = await this.getUseCases()
    return await useCases.getWithLegalDocuments.execute({ quoteId })
  }

  async updateQuote(
    quoteId: string,
    updates: QuoteUpdateData,
    actorId: string
  ): Promise<QuoteRecord> {
    const useCases = await this.getUseCases()
    return await useCases.update.execute({ quoteId, updates, actorId })
  }

  async acceptQuote(quoteId: string, actorId: string): Promise<QuoteRecord> {
    const useCases = await this.getUseCases()
    return await useCases.accept.execute({ quoteId, actorId })
  }

  async rejectQuote(
    quoteId: string,
    rejectionReason: string,
    actorId: string
  ): Promise<QuoteRecord> {
    const useCases = await this.getUseCases()
    return await useCases.reject.execute({ quoteId, rejectionReason, actorId })
  }

  async getQuotesByRequest(
    requestId: string,
    actorId: string
  ): Promise<Array<QuoteRecord & { legalDocuments: unknown[] }>> {
    const useCases = await this.getUseCases()
    return await useCases.listByRequest.execute({ requestId, actorId })
  }

  async getOrganizationQuotes(
    organizationId: string,
    actorId: string
  ): Promise<Array<QuoteRecord & { legalDocuments: unknown[] }>> {
    const useCases = await this.getUseCases()
    return await useCases.listByOrganization.execute({ organizationId, actorId })
  }

  async canCreateQuote(requestId: string, actorId: string): Promise<boolean> {
    const useCases = await this.getUseCases()
    return await useCases.canCreate.execute({ requestId, actorId })
  }

  async resolveQuoteAccess(quoteId: string, actorId: string) {
    const useCases = await this.getUseCases()
    return await useCases.checkAccess.execute({ quoteId, actorId })
  }
}

export const quoteApplicationService = new QuoteApplicationService()
