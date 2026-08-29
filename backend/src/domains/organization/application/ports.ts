import type {
  NormalizedOrganizationMemberFilters,
  OrganizationDashboardMetrics,
  OrganizationDashboardOrganization,
  OrganizationFont,
  OrganizationInfo,
  OrganizationLogoSnapshot,
  OrganizationLogoUpload,
  OrganizationLogoUploadResult,
  OrganizationMember,
  OrganizationProfile,
  OrganizationSetupSnapshot,
  OrganizationShowcaseData,
  OrganizationStatusRecord,
  OrganizationSubscriptionRecord,
} from '../domain'

export type OrganizationMembershipRecord = {
  id: string
  role: string
  organizationId: string
  userId: string
}

export type UserOrganizationRecord = {
  id: string
  name: string
  slug: string | null
  logo: string | null
  role: string
  createdAt: Date
}

export type OrganizationMemberRoleUpdate = {
  id: string
  userId: string
  role: string
  userName: string
}

export type OrganizationMemberRemoval = OrganizationMemberRoleUpdate & {
  userEmail: string
  organizationName: string
}

export type OrganizationLeavingMember = {
  role: string
  userName: string
  userEmail: string
  organizationName: string
}

export type OrganizationSettingsUpdate = {
  name?: string
  slug?: string
  tagline?: string | null
  overview?: string | null
  website?: string | null
  brandColor?: string
  font?: OrganizationFont
}

export type OrganizationTaxIdUpdate = {
  taxIdType: string | null
  taxIdNumber: string | null
}

export interface OrganizationProfileQueryPort {
  findBySlug(slug: string): Promise<OrganizationProfile | null>
  findInfo(organizationId: string): Promise<OrganizationInfo | null>
}

export interface OrganizationStatusQueryPort {
  findOrganizationStatus(organizationId: string): Promise<OrganizationStatusRecord | null>
  findActiveSubscription(organizationId: string): Promise<OrganizationSubscriptionRecord | null>
}

export interface OrganizationMembershipQueryPort {
  findMembership(
    userId: string,
    organizationId: string
  ): Promise<OrganizationMembershipRecord | null>
}

export interface OrganizationMemberUserIdsQueryPort {
  listMemberUserIds(organizationId: string): Promise<string[]>
}

export interface UserOrganizationsQueryPort {
  listUserOrganizations(userId: string): Promise<UserOrganizationRecord[]>
}

export interface OrganizationSetupQueryPort {
  getSetupSnapshot(organizationId: string): Promise<OrganizationSetupSnapshot>
}

export interface OrganizationShowcaseQueryPort {
  findBySlug(slug: string, days?: number): Promise<OrganizationShowcaseData | null>
}

export interface OrganizationLogoRepositoryPort {
  findLogo(organizationId: string): Promise<OrganizationLogoSnapshot | null>
  setLogo(organizationId: string, logoUrl: string): Promise<void>
  clearLogo(organizationId: string): Promise<void>
}

export interface OrganizationLogoStoragePort {
  uploadLogo(upload: OrganizationLogoUpload): Promise<OrganizationLogoUploadResult>
  deleteLogoFiles(logoUrl: string): Promise<void>
}

export interface OrganizationLogoActivityPort {
  logLogoUpdated(organizationId: string, actorId: string): Promise<void>
  logLogoRemoved(organizationId: string, actorId: string): Promise<void>
}

export interface OrganizationDashboardQueryPort {
  findDashboardOrganization(
    organizationId: string
  ): Promise<OrganizationDashboardOrganization | null>
  getDashboardMetrics(organizationId: string): Promise<OrganizationDashboardMetrics>
}

export interface OrganizationMemberQueryPort {
  countMembers(
    organizationId: string,
    filters: NormalizedOrganizationMemberFilters
  ): Promise<number>
  listMembersForDashboard(
    organizationId: string,
    filters: NormalizedOrganizationMemberFilters
  ): Promise<OrganizationMember[]>
  listMembersPage(
    organizationId: string,
    filters: NormalizedOrganizationMemberFilters
  ): Promise<OrganizationMember[]>
}

export interface OrganizationMemberMutationRepositoryPort {
  findMemberForRoleUpdate(
    organizationId: string,
    memberId: string
  ): Promise<OrganizationMemberRoleUpdate | null>
  updateMemberRole(memberId: string, newRole: 'admin' | 'member'): Promise<void>
  findMemberForRemoval(
    organizationId: string,
    memberId: string
  ): Promise<OrganizationMemberRemoval | null>
  removeMemberAndUnassignRequests(input: {
    organizationId: string
    memberId: string
    userId: string
  }): Promise<void>
  findLeavingMember(
    organizationId: string,
    userId: string
  ): Promise<OrganizationLeavingMember | null>
  leaveOrganizationAndUnassignRequests(input: {
    organizationId: string
    userId: string
  }): Promise<void>
}

export interface OrganizationMemberActivityPort {
  logMemberRoleUpdated(input: {
    organizationId: string
    actorId: string
    memberId: string
    targetUserId: string
    targetUserName: string
    previousRole: string
    newRole: 'admin' | 'member'
  }): Promise<void>
  logMemberRemoved(input: {
    organizationId: string
    actorId: string
    member: OrganizationMemberRemoval
  }): Promise<void>
  logMemberLeft(input: {
    organizationId: string
    actorId: string
    member: OrganizationLeavingMember
  }): Promise<void>
}

export interface OrganizationMemberNotificationPort {
  notifyMemberRemoved(input: {
    organizationId: string
    member: OrganizationMemberRemoval
  }): Promise<void>
  notifyMemberLeft(input: {
    organizationId: string
    userId: string
    member: OrganizationLeavingMember
  }): Promise<void>
}

export interface OrganizationSeatReconciliationPort {
  reconcileSeats(organizationId: string): Promise<void>
}

export interface OrganizationSettingsRepositoryPort {
  findSlug(organizationId: string): Promise<string | null>
  updateSettings(organizationId: string, settings: OrganizationSettingsUpdate): Promise<void>
  updateTaxId(organizationId: string, taxId: OrganizationTaxIdUpdate): Promise<void>
}

export interface OrganizationSlugPort {
  validateSlug(slug: string): { valid: true } | { valid: false; errorCode: string; error: string }
  isSlugAvailableForOrganization(slug: string, organizationId: string): Promise<boolean>
}

export interface OrganizationEmailIntakeRepositoryPort {
  findSlug(organizationId: string): Promise<string | null>
  setEmailIntakeEnabled(organizationId: string, enabled: boolean): Promise<void>
}

export interface OrganizationSettingNotificationPort {
  notifySettingChange(
    organizationId: string,
    actorId: string,
    settingName: string,
    enabled: boolean
  ): Promise<void>
}

export type OrganizationRealtimeUpdatePayload = {
  organization: {
    id: string
    name: string
    slug: string
    logo: string | null
    brandLogo?: string | null
    tagline?: string | null
    brandColor?: string
    font?: string
  }
  previousSlug?: string | null
}

export interface OrganizationRealtimeNotifierPort {
  notifyOrganizationUpdated(
    userIds: string[],
    payload: OrganizationRealtimeUpdatePayload
  ): Promise<void>
}
