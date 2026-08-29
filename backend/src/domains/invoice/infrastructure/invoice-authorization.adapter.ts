import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/database'
import { invoice } from '../../../infrastructure/database/db/schemas/invoice-schema'
import { request } from '../../../infrastructure/database/db/schemas/request-schema'
import { organizationApplicationService } from '../../organization/organization.application'
import type {
  InvoiceAccessSnapshot,
  InvoiceAuthorizationPort,
  InvoiceOrganizationMembershipPort,
  InvoiceOrganizationRolePort,
} from '../application/ports'

export class DrizzleInvoiceAuthorizationAdapter implements InvoiceAuthorizationPort {
  async findInvoiceAccess(invoiceId: string): Promise<InvoiceAccessSnapshot | null> {
    const existingInvoice = await db
      .select({
        organizationId: invoice.organizationId,
        requestId: invoice.requestId,
        createdById: invoice.createdById,
      })
      .from(invoice)
      .where(eq(invoice.id, invoiceId))
      .limit(1)

    return existingInvoice[0] ?? null
  }

  async findRequestRequesterId(requestId: string): Promise<string | null> {
    const requestData = await db
      .select({ requesterId: request.requesterId })
      .from(request)
      .where(eq(request.id, requestId))
      .limit(1)

    return requestData[0]?.requesterId ?? null
  }

  async findRequestAccess(requestId: string) {
    const requestData = await db
      .select({
        organizationId: request.receiverOrganizationId,
        requesterId: request.requesterId,
      })
      .from(request)
      .where(eq(request.id, requestId))
      .limit(1)

    return requestData[0] ?? null
  }
}

export class OrganizationInvoiceRoleAdapter
  implements InvoiceOrganizationRolePort, InvoiceOrganizationMembershipPort
{
  async getUserRole(organizationId: string, userId: string): Promise<string | null> {
    return await organizationApplicationService.getUserRole(organizationId, userId)
  }

  async hasMembership(organizationId: string, userId: string): Promise<boolean> {
    return (await this.getUserRole(organizationId, userId)) !== null
  }
}
