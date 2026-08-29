import type { Invoice } from './application/invoice-models'
import type { InvoiceAccessDecision } from './application/ports'
import {
  getInvoiceUseCases,
  type InvoiceUseCaseContainer,
} from './infrastructure/invoice-use-cases'

export class InvoiceApplicationService {
  constructor(private readonly injectedUseCases?: InvoiceUseCaseContainer) {}

  async checkInvoiceAccess(invoiceId: string, userId: string): Promise<InvoiceAccessDecision> {
    const useCases = await this.getUseCases()
    return await useCases.checkAccess.execute({ invoiceId, userId })
  }

  async createInvoiceFromQuote(command: {
    quoteId: string
    actorId: string
    dueDate: Date
    description?: string
    terms?: string
    notes?: string
    logActivity?: boolean
    acceptedByRequester?: boolean
  }): Promise<Invoice> {
    const useCases = await this.getUseCases()
    return await useCases.createFromQuote.execute(command)
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    const useCases = await this.getUseCases()
    return await useCases.getById.execute({ invoiceId })
  }

  async getInvoicesByOrganization(organizationId: string, actorId: string): Promise<Invoice[]> {
    const useCases = await this.getUseCases()
    return await useCases.listByOrganization.execute({ organizationId, actorId })
  }

  async getInvoicesByRequest(requestId: string, userId: string): Promise<Invoice[]> {
    const useCases = await this.getUseCases()
    return await useCases.listByRequest.execute({ requestId, userId })
  }

  async sendInvoice(invoiceId: string, actorId: string): Promise<Invoice> {
    const useCases = await this.getUseCases()
    return await useCases.send.execute({ invoiceId, actorId })
  }

  private async getUseCases(): Promise<InvoiceUseCaseContainer> {
    return this.injectedUseCases ?? (await getInvoiceUseCases())
  }
}

export const invoiceApplicationService = new InvoiceApplicationService()
