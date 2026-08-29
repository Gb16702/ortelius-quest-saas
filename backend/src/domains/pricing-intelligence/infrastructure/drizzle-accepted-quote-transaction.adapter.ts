import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { type IQuotePricing, quote } from '../../../infrastructure/database/db/schemas/quote-schema'
import { cargoDetails, request } from '../../../infrastructure/database/db/schemas/request-schema'
import type { AcceptedQuoteTransactionPort } from '../application/ports'
import type { HistoricalTransactionInput } from '../application/pricing-intelligence-models'

export class DrizzleAcceptedQuoteTransactionAdapter implements AcceptedQuoteTransactionPort {
  async loadAcceptedQuoteTransactions(
    quoteId: string,
    organizationId: string
  ): Promise<Omit<HistoricalTransactionInput, 'id' | 'createdAt'>[]> {
    const [quoteData] = await db.select().from(quote).where(eq(quote.id, quoteId)).limit(1)

    if (!quoteData) return []

    const [requestData] = await db
      .select()
      .from(request)
      .where(eq(request.id, quoteData.requestId))
      .limit(1)

    if (!requestData) return []

    let cargoData: {
      weight: number | null
      volume: number | null
      options: Record<string, boolean> | null
    } | null = null
    if (requestData.cargoDetailsId) {
      const [cargo] = await db
        .select()
        .from(cargoDetails)
        .where(eq(cargoDetails.id, requestData.cargoDetailsId))
        .limit(1)
      cargoData = cargo ?? null
    }

    const pricing = quoteData.pricing as IQuotePricing
    const services = quoteData.services as Array<{
      serviceId: string
      included: boolean
      price: number
    }> | null

    if (!services?.length) return []

    return services
      .filter((selectedService) => selectedService.included && selectedService.price > 0)
      .map((selectedService) => ({
        organizationId,
        serviceId: selectedService.serviceId,
        price: selectedService.price,
        currency: pricing?.currency ?? 'EUR',
        cargoCategories: (requestData.categories as string[]) ?? [],
        cargoWeight: cargoData?.weight ?? null,
        cargoVolume: cargoData?.volume ?? null,
        cargoIsHazardous: cargoData?.options?.hazardous ? 1 : 0,
        cargoIsReefer: cargoData?.options?.refrigerated ? 1 : 0,
        cargoIsOversized: cargoData?.options?.oversized ? 1 : 0,
        source: 'accepted_quote',
        importBatchId: null,
        quoteId,
        transactionDate: new Date(),
      }))
  }
}
