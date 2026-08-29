export type OrganizationSetupSnapshot = {
  logo?: string | null
  tagline?: string | null
  overview?: string | null
  taxIdType?: string | null
  taxIdNumber?: string | null
  servicesCount: number
  cargoTypesCount: number
  legalDocumentsCount: number
  memberCount: number
}

export type OrganizationSetupStatus = {
  hasLogo: boolean
  hasTagline: boolean
  hasOverview: boolean
  hasServices: boolean
  hasCargoTypes: boolean
  hasVatConfig: boolean
  hasLegalDocuments: boolean
  memberCount: number
  isComplete: boolean
}

export function deriveOrganizationSetupStatus(
  snapshot: OrganizationSetupSnapshot
): OrganizationSetupStatus {
  const hasLogo = !!snapshot.logo
  const hasTagline = !!snapshot.tagline && snapshot.tagline.trim().length > 0
  const hasOverview = !!snapshot.overview && snapshot.overview.trim().length > 0
  const hasServices = snapshot.servicesCount > 0
  const hasCargoTypes = snapshot.cargoTypesCount > 0
  const hasVatConfig = !!snapshot.taxIdType && !!snapshot.taxIdNumber
  const hasLegalDocuments = snapshot.legalDocumentsCount > 0

  // Legal documents gate quote creation, not profile setup completion.
  const isComplete = hasLogo && hasTagline && hasServices && hasCargoTypes && hasVatConfig

  return {
    hasLogo,
    hasTagline,
    hasOverview,
    hasServices,
    hasCargoTypes,
    hasVatConfig,
    hasLegalDocuments,
    memberCount: snapshot.memberCount,
    isComplete,
  }
}
