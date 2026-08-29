export type OrganizationStatusRecord = {
  id: string
  name: string
  status: string
  slug: string | null
}

export type OrganizationSubscriptionRecord = {
  plan: string
  status: string
}

export type OrganizationStatusFlags = {
  isActive: boolean
  isPending: boolean
  isSuspended: boolean
  requiresSubscription: boolean
}

export function deriveOrganizationStatusFlags(
  organization: Pick<OrganizationStatusRecord, 'status'>,
  subscription: OrganizationSubscriptionRecord | null
): OrganizationStatusFlags {
  return {
    isActive: organization.status === 'active',
    isPending: organization.status === 'pending',
    isSuspended: organization.status === 'suspended',
    requiresSubscription: organization.status === 'pending' && !subscription,
  }
}
