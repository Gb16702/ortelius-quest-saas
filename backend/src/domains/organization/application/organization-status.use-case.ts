import {
  deriveOrganizationStatusFlags,
  type OrganizationStatusFlags,
  type OrganizationStatusRecord,
  type OrganizationSubscriptionRecord,
} from '../domain'
import { OrganizationNotFoundError } from './organization-errors'
import type { OrganizationStatusQueryPort } from './ports'

export type OrganizationStatusResult = OrganizationStatusFlags & {
  organization: OrganizationStatusRecord
  subscription: OrganizationSubscriptionRecord | null
}

export class GetOrganizationStatusUseCase {
  constructor(private readonly organizations: OrganizationStatusQueryPort) {}

  async execute(command: { organizationId: string }): Promise<OrganizationStatusResult> {
    const organization = await this.organizations.findOrganizationStatus(command.organizationId)
    if (!organization) {
      throw new OrganizationNotFoundError()
    }

    const subscription = await this.organizations.findActiveSubscription(command.organizationId)
    return {
      organization,
      subscription,
      ...deriveOrganizationStatusFlags(organization, subscription),
    }
  }
}
