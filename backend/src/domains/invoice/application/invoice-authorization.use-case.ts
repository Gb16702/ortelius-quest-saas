import type {
  InvoiceAccessDecision,
  InvoiceAuthorizationPort,
  InvoiceOrganizationRolePort,
} from './ports'

export class CheckInvoiceAccessUseCase {
  constructor(
    private readonly invoices: InvoiceAuthorizationPort,
    private readonly organizations: InvoiceOrganizationRolePort
  ) {}

  async execute(command: { invoiceId: string; userId: string }): Promise<InvoiceAccessDecision> {
    const invoice = await this.invoices.findInvoiceAccess(command.invoiceId)
    if (!invoice) return 'not_found'

    if (invoice.createdById === command.userId) return 'allowed'

    const role = await this.organizations.getUserRole(invoice.organizationId, command.userId)
    if (role) return 'allowed'

    const requesterId = await this.invoices.findRequestRequesterId(invoice.requestId)
    if (requesterId === command.userId) return 'allowed'

    return 'forbidden'
  }
}
