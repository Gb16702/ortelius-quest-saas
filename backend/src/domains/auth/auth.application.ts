import type {
  AuthMembership,
  CheckAuthProviderResponse,
  Organization,
  RoleHierarchy,
} from './application/auth-models'
import {
  GetRoleHierarchyUseCase,
  HasRequiredRoleUseCase,
  ValidateRoleUseCase,
} from './application/auth-use-cases'
import { getAuthUseCases } from './infrastructure/auth-use-cases'

const hasRequiredRoleUseCase = new HasRequiredRoleUseCase()
const getRoleHierarchyUseCase = new GetRoleHierarchyUseCase()
const validateRoleUseCase = new ValidateRoleUseCase()

export class AuthApplicationService {
  async checkAuthProvider(email: string): Promise<CheckAuthProviderResponse> {
    const useCases = await getAuthUseCases()
    return await useCases.checkAuthProvider.execute({ email })
  }

  async checkUserExistsByEmail(email: string): Promise<boolean> {
    const response = await this.checkAuthProvider(email)
    return response.has_email_password
  }

  async getUserOrganizationMembership(
    userId: string,
    organizationId: string
  ): Promise<AuthMembership | null> {
    const useCases = await getAuthUseCases()
    return await useCases.getUserOrganizationMembership.execute({ userId, organizationId })
  }

  async validateOrganizationExists(organizationId: string): Promise<Organization | null> {
    const useCases = await getAuthUseCases()
    return await useCases.validateOrganizationExists.execute({ organizationId })
  }

  hasRequiredRole(userRole: string, requiredRole: string): boolean {
    return hasRequiredRoleUseCase.execute({ userRole, requiredRole })
  }

  getRoleHierarchy(): RoleHierarchy {
    return getRoleHierarchyUseCase.execute()
  }

  validateRole(role: string): boolean {
    return validateRoleUseCase.execute({ role })
  }
}

export const authApplicationService = new AuthApplicationService()
