import type { Invoice } from './invoice-models'

export type InvoiceAccessSnapshot = {
  organizationId: string
  requestId: string
  createdById: string
}

export type InvoiceRequestAccessSnapshot = {
  organizationId: string
  requesterId: string | null
}

export type InvoiceAccessDecision = 'allowed' | 'not_found' | 'forbidden'

export interface InvoiceAuthorizationPort {
  findInvoiceAccess(invoiceId: string): Promise<InvoiceAccessSnapshot | null>
  findRequestAccess(requestId: string): Promise<InvoiceRequestAccessSnapshot | null>
  findRequestRequesterId(requestId: string): Promise<string | null>
}

export interface InvoiceOrganizationRolePort {
  getUserRole(organizationId: string, userId: string): Promise<string | null>
}

export interface InvoiceOrganizationMembershipPort {
  hasMembership(organizationId: string, userId: string): Promise<boolean>
}

export interface InvoiceActivityPort {
  logInvoiceCreated(input: {
    organizationId: string
    actorId: string
    invoiceId: string
    requestId: string
    reqNumber?: string
  }): Promise<void>
  logInvoiceSent(input: {
    organizationId: string
    actorId: string
    invoiceId: string
    requestId: string
    reqNumber?: string
  }): Promise<void>
}

export interface InvoiceRequestLookupPort {
  getRequestNumber(requestId: string): Promise<string | undefined>
}

export interface InvoiceLifecycleSideEffectsPort {
  afterInvoiceCreated(input: { invoice: Invoice; actorId: string }): Promise<void>
  afterInvoiceSent(input: { invoice: Invoice; actorId: string }): Promise<void>
}
