import { getRoleHierarchy, hasRequiredRole, isAuthRole, normalizeAuthEmail } from '../domain'
import type {
  AuthMembership,
  CheckAuthProviderRequest,
  CheckAuthProviderResponse,
  Organization,
  RoleHierarchy,
} from './auth-models'
import type { AuthRepositoryPort } from './ports'

export class CheckAuthProviderUseCase {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(command: CheckAuthProviderRequest): Promise<CheckAuthProviderResponse> {
    const hasEmailPassword = await this.authRepository.checkUserExistsByEmail(
      normalizeAuthEmail(command.email)
    )

    return {
      has_email_password: hasEmailPassword,
      has_sso_provider: false,
    }
  }
}

export class GetUserOrganizationMembershipUseCase {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(command: {
    userId: string
    organizationId: string
  }): Promise<AuthMembership | null> {
    return await this.authRepository.getUserOrganizationMembership(
      command.userId,
      command.organizationId
    )
  }
}

export class ValidateOrganizationExistsUseCase {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(command: { organizationId: string }): Promise<Organization | null> {
    return await this.authRepository.validateOrganizationExists(command.organizationId)
  }
}

export class HasRequiredRoleUseCase {
  execute(command: { userRole: string; requiredRole: string }): boolean {
    return hasRequiredRole(command.userRole, command.requiredRole)
  }
}

export class GetRoleHierarchyUseCase {
  execute(): RoleHierarchy {
    return getRoleHierarchy()
  }
}

export class ValidateRoleUseCase {
  execute(command: { role: string }): boolean {
    return isAuthRole(command.role)
  }
}
