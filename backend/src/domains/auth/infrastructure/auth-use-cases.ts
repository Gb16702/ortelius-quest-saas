import {
  CheckAuthProviderUseCase,
  GetRoleHierarchyUseCase,
  GetUserOrganizationMembershipUseCase,
  HasRequiredRoleUseCase,
  ValidateOrganizationExistsUseCase,
  ValidateRoleUseCase,
} from '../application/auth-use-cases'
import { DrizzleAuthRepository } from './auth.repository'

export interface AuthUseCaseContainer {
  checkAuthProvider: CheckAuthProviderUseCase
  getUserOrganizationMembership: GetUserOrganizationMembershipUseCase
  validateOrganizationExists: ValidateOrganizationExistsUseCase
  hasRequiredRole: HasRequiredRoleUseCase
  getRoleHierarchy: GetRoleHierarchyUseCase
  validateRole: ValidateRoleUseCase
}

let authUseCases: AuthUseCaseContainer | null = null

export async function getAuthUseCases(): Promise<AuthUseCaseContainer> {
  if (authUseCases) return authUseCases

  const authRepository = new DrizzleAuthRepository()
  authUseCases = {
    checkAuthProvider: new CheckAuthProviderUseCase(authRepository),
    getUserOrganizationMembership: new GetUserOrganizationMembershipUseCase(authRepository),
    validateOrganizationExists: new ValidateOrganizationExistsUseCase(authRepository),
    hasRequiredRole: new HasRequiredRoleUseCase(),
    getRoleHierarchy: new GetRoleHierarchyUseCase(),
    validateRole: new ValidateRoleUseCase(),
  }

  return authUseCases
}
