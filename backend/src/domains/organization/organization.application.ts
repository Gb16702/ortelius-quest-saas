import type { OrganizationStatusResult } from './application/organization-status.use-case'
import type {
  OrganizationSettingsUpdate,
  OrganizationTaxIdUpdate,
  UserOrganizationRecord,
} from './application/ports'
import type {
  OrganizationDashboard,
  OrganizationEmailIntakeResult,
  OrganizationInfo,
  OrganizationLogoUploadResult,
  OrganizationMemberFilterOptions,
  OrganizationMembersPage,
  OrganizationProfile,
  OrganizationSetupStatus,
  OrganizationShowcaseData,
} from './domain'
import { getOrganizationUseCases } from './infrastructure/organization-use-cases'

export class OrganizationApplicationService {
  private async getUseCases() {
    return await getOrganizationUseCases()
  }

  async getStatus(organizationId: string): Promise<OrganizationStatusResult> {
    const useCases = await this.getUseCases()
    return await useCases.getStatus.execute({ organizationId })
  }

  async getBySlug(slug: string): Promise<OrganizationProfile | null> {
    const useCases = await this.getUseCases()
    return await useCases.getBySlug.execute({ slug })
  }

  async getInfo(organizationId: string): Promise<OrganizationInfo | null> {
    const useCases = await this.getUseCases()
    return await useCases.getInfo.execute({ organizationId })
  }

  async getShowcaseData(slug: string, days?: number): Promise<OrganizationShowcaseData> {
    const useCases = await this.getUseCases()
    return await useCases.getShowcase.execute({ slug, days })
  }

  async getDashboard(
    organizationId: string,
    actorId: string,
    filters?: OrganizationMemberFilterOptions
  ): Promise<OrganizationDashboard> {
    const useCases = await this.getUseCases()
    return await useCases.getDashboard.execute({ organizationId, actorId, filters })
  }

  async listMembers(
    organizationId: string,
    actorId: string,
    filters?: OrganizationMemberFilterOptions
  ): Promise<OrganizationMembersPage> {
    const useCases = await this.getUseCases()
    return await useCases.listMembers.execute({ organizationId, actorId, filters })
  }

  async updateMemberRole(
    organizationId: string,
    actorId: string,
    memberId: string,
    role: 'admin' | 'member'
  ): Promise<{ id: string; role: string }> {
    const useCases = await this.getUseCases()
    return await useCases.updateMemberRole.execute({ organizationId, actorId, memberId, role })
  }

  async leaveOrganization(organizationId: string, actorId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.leaveOrganization.execute({ organizationId, actorId })
  }

  async removeMember(organizationId: string, actorId: string, memberId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.removeMember.execute({ organizationId, actorId, memberId })
  }

  async updateLogo(
    organizationId: string,
    actorId: string,
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<OrganizationLogoUploadResult> {
    const useCases = await this.getUseCases()
    return await useCases.updateLogo.execute({
      organizationId,
      actorId,
      buffer,
      filename,
      contentType,
    })
  }

  async removeLogo(organizationId: string, actorId: string): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.removeLogo.execute({ organizationId, actorId })
  }

  async getSetupStatus(organizationId: string, actorId: string): Promise<OrganizationSetupStatus> {
    const useCases = await this.getUseCases()
    return await useCases.getSetupStatus.execute({ organizationId, actorId })
  }

  async getUserRole(organizationId: string, actorId: string): Promise<string | null> {
    const useCases = await this.getUseCases()
    return await useCases.getUserRole.execute({ organizationId, actorId })
  }

  async listUserOrganizations(userId: string): Promise<UserOrganizationRecord[]> {
    const useCases = await this.getUseCases()
    return await useCases.listUserOrganizations.execute({ userId })
  }

  async notifyRealtimeUpdate(organizationId: string, previousSlug?: string | null): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.notifyRealtimeUpdate.execute({ organizationId, previousSlug })
  }

  async updateEmailIntake(
    organizationId: string,
    actorId: string,
    enabled: boolean
  ): Promise<OrganizationEmailIntakeResult> {
    const useCases = await this.getUseCases()
    return await useCases.updateEmailIntake.execute({ organizationId, actorId, enabled })
  }

  async updateSettings(
    organizationId: string,
    actorId: string,
    settings: OrganizationSettingsUpdate
  ): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.updateSettings.execute({ organizationId, actorId, settings })
  }

  async updateTaxId(
    organizationId: string,
    actorId: string,
    taxId: OrganizationTaxIdUpdate
  ): Promise<void> {
    const useCases = await this.getUseCases()
    await useCases.updateTaxId.execute({ organizationId, actorId, taxId })
  }
}

export const organizationApplicationService = new OrganizationApplicationService()
