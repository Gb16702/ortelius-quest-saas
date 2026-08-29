import { UpdateOrganizationEmailIntakeUseCase } from '../application/organization-email-intake.use-case'
import {
  RemoveOrganizationLogoUseCase,
  UpdateOrganizationLogoUseCase,
} from '../application/organization-logo.use-cases'
import {
  LeaveOrganizationUseCase,
  RemoveOrganizationMemberUseCase,
  UpdateOrganizationMemberRoleUseCase,
} from '../application/organization-member-mutations.use-cases'
import {
  GetOrganizationDashboardUseCase,
  ListOrganizationMembersUseCase,
} from '../application/organization-member-queries.use-cases'
import {
  GetOrganizationUserRoleUseCase,
  ListUserOrganizationsUseCase,
} from '../application/organization-membership.use-cases'
import {
  GetOrganizationBySlugUseCase,
  GetOrganizationInfoUseCase,
} from '../application/organization-profile.use-cases'
import { NotifyOrganizationRealtimeUpdateUseCase } from '../application/organization-realtime.use-case'
import {
  UpdateOrganizationSettingsUseCase,
  UpdateOrganizationTaxIdUseCase,
} from '../application/organization-settings.use-cases'
import { GetOrganizationSetupStatusUseCase } from '../application/organization-setup.use-case'
import { GetOrganizationShowcaseUseCase } from '../application/organization-showcase.use-case'
import { GetOrganizationStatusUseCase } from '../application/organization-status.use-case'

export interface OrganizationUseCaseContainer {
  getDashboard: GetOrganizationDashboardUseCase
  getBySlug: GetOrganizationBySlugUseCase
  getInfo: GetOrganizationInfoUseCase
  getShowcase: GetOrganizationShowcaseUseCase
  leaveOrganization: LeaveOrganizationUseCase
  listMembers: ListOrganizationMembersUseCase
  removeLogo: RemoveOrganizationLogoUseCase
  removeMember: RemoveOrganizationMemberUseCase
  getSetupStatus: GetOrganizationSetupStatusUseCase
  getStatus: GetOrganizationStatusUseCase
  getUserRole: GetOrganizationUserRoleUseCase
  listUserOrganizations: ListUserOrganizationsUseCase
  notifyRealtimeUpdate: NotifyOrganizationRealtimeUpdateUseCase
  updateEmailIntake: UpdateOrganizationEmailIntakeUseCase
  updateLogo: UpdateOrganizationLogoUseCase
  updateMemberRole: UpdateOrganizationMemberRoleUseCase
  updateSettings: UpdateOrganizationSettingsUseCase
  updateTaxId: UpdateOrganizationTaxIdUseCase
}

let organizationUseCases: OrganizationUseCaseContainer | null = null

export async function getOrganizationUseCases(): Promise<OrganizationUseCaseContainer> {
  if (organizationUseCases) return organizationUseCases

  const [
    { DrizzleOrganizationMembershipRepository },
    { DrizzleOrganizationEmailIntakeRepository },
    { DrizzleOrganizationLogoRepository },
    { DrizzleOrganizationMemberQueryRepository },
    { DrizzleOrganizationMemberMutationRepository },
    { DrizzleOrganizationProfileRepository },
    { DrizzleOrganizationShowcaseRepository },
    { DrizzleOrganizationSetupRepository },
    { DrizzleOrganizationSettingsRepository },
    { NetworkOrganizationSlugAdapter },
    { DrizzleOrganizationStatusRepository },
    { ActivityOrganizationLogoAdapter },
    { ActivityOrganizationMemberAdapter },
    { S3OrganizationLogoStorageAdapter },
    { OrganizationMemberNotificationAdapter },
    { SubscriptionOrganizationSeatReconciliationAdapter },
    { TeamChatOrganizationSettingNotificationAdapter },
    { WebSocketOrganizationRealtimeNotifier },
  ] = await Promise.all([
    import('./organization-membership.repository'),
    import('./organization-email-intake.repository'),
    import('./organization-logo.repository'),
    import('./organization-member-query.repository'),
    import('./organization-member-mutation.repository'),
    import('./organization-profile.repository'),
    import('./organization-showcase.repository'),
    import('./organization-setup.repository'),
    import('./organization-settings.repository'),
    import('./organization-slug.adapter'),
    import('./organization-status.repository'),
    import('./organization-logo-activity.adapter'),
    import('./organization-member-activity.adapter'),
    import('./organization-logo-storage.adapter'),
    import('./organization-member-notification.adapter'),
    import('./organization-seat-reconciliation.adapter'),
    import('./organization-setting-notification.adapter'),
    import('./organization-realtime-notifier.adapter'),
  ])

  const emailIntakeRepository = new DrizzleOrganizationEmailIntakeRepository()
  const logoRepository = new DrizzleOrganizationLogoRepository()
  const logoActivity = new ActivityOrganizationLogoAdapter()
  const logoStorage = new S3OrganizationLogoStorageAdapter()
  const memberMutations = new DrizzleOrganizationMemberMutationRepository()
  const memberQueries = new DrizzleOrganizationMemberQueryRepository()
  const memberships = new DrizzleOrganizationMembershipRepository()
  const memberActivity = new ActivityOrganizationMemberAdapter()
  const memberNotifications = new OrganizationMemberNotificationAdapter()
  const seatReconciliation = new SubscriptionOrganizationSeatReconciliationAdapter()
  const settingNotifications = new TeamChatOrganizationSettingNotificationAdapter()
  const realtimeNotifier = new WebSocketOrganizationRealtimeNotifier()
  const profileRepository = new DrizzleOrganizationProfileRepository()
  const setupRepository = new DrizzleOrganizationSetupRepository()
  const settingsRepository = new DrizzleOrganizationSettingsRepository()
  const slugAdapter = new NetworkOrganizationSlugAdapter()
  const showcaseRepository = new DrizzleOrganizationShowcaseRepository()
  const statusRepository = new DrizzleOrganizationStatusRepository()

  organizationUseCases = {
    getDashboard: new GetOrganizationDashboardUseCase(memberships, memberQueries, memberQueries),
    getBySlug: new GetOrganizationBySlugUseCase(profileRepository),
    getInfo: new GetOrganizationInfoUseCase(profileRepository),
    getShowcase: new GetOrganizationShowcaseUseCase(showcaseRepository),
    leaveOrganization: new LeaveOrganizationUseCase(
      memberMutations,
      memberActivity,
      memberNotifications,
      seatReconciliation
    ),
    listMembers: new ListOrganizationMembersUseCase(memberships, memberQueries),
    removeLogo: new RemoveOrganizationLogoUseCase(
      memberships,
      logoRepository,
      logoStorage,
      logoActivity
    ),
    removeMember: new RemoveOrganizationMemberUseCase(
      memberships,
      memberMutations,
      memberActivity,
      memberNotifications,
      seatReconciliation
    ),
    getSetupStatus: new GetOrganizationSetupStatusUseCase(memberships, setupRepository),
    getStatus: new GetOrganizationStatusUseCase(statusRepository),
    getUserRole: new GetOrganizationUserRoleUseCase(memberships),
    listUserOrganizations: new ListUserOrganizationsUseCase(memberships),
    notifyRealtimeUpdate: new NotifyOrganizationRealtimeUpdateUseCase(
      profileRepository,
      memberships,
      realtimeNotifier
    ),
    updateEmailIntake: new UpdateOrganizationEmailIntakeUseCase(
      memberships,
      emailIntakeRepository,
      settingNotifications
    ),
    updateLogo: new UpdateOrganizationLogoUseCase(
      memberships,
      logoRepository,
      logoStorage,
      logoActivity
    ),
    updateMemberRole: new UpdateOrganizationMemberRoleUseCase(
      memberships,
      memberMutations,
      memberActivity
    ),
    updateSettings: new UpdateOrganizationSettingsUseCase(
      memberships,
      settingsRepository,
      slugAdapter
    ),
    updateTaxId: new UpdateOrganizationTaxIdUseCase(memberships, settingsRepository),
  }

  return organizationUseCases
}
