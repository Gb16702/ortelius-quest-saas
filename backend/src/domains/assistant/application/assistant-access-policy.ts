import type { AssistantRepositoryPort } from './ports'

export type AssistantAccessDenialReason =
  | 'FEATURE_DISABLED'
  | 'ORGANIZATION_REQUIRED'
  | 'ORGANIZATION_FORBIDDEN'
  | 'SUBSCRIPTION_REQUIRED'
  | 'PLAN_NOT_ALLOWED'
  | 'SUBSCRIPTION_NOT_ACTIVE'

export interface AssistantAccessPolicyConfig {
  enabled: boolean
  allowedPlans: readonly string[]
  allowedStatuses: readonly string[]
}

export interface AssistantAccessCheckInput {
  userId: string
  organizationId?: string | null
}

export type AssistantAccessCheckResult =
  | { allowed: true }
  | {
      allowed: false
      reason: AssistantAccessDenialReason
      message: string
      status: 402 | 403
      details?: Record<string, unknown>
    }

export interface AssistantAccessPolicyPort {
  checkAccess(input: AssistantAccessCheckInput): Promise<AssistantAccessCheckResult>
}

export const DEFAULT_ASSISTANT_ACCESS_POLICY_CONFIG: AssistantAccessPolicyConfig = {
  enabled: true,
  allowedPlans: ['professional', 'enterprise'],
  allowedStatuses: ['active', 'trialing'],
}

export class AssistantAccessPolicy implements AssistantAccessPolicyPort {
  constructor(
    private readonly repository: AssistantRepositoryPort,
    private readonly config: AssistantAccessPolicyConfig = DEFAULT_ASSISTANT_ACCESS_POLICY_CONFIG
  ) {}

  async checkAccess(input: AssistantAccessCheckInput): Promise<AssistantAccessCheckResult> {
    if (!this.config.enabled) {
      return {
        allowed: false,
        reason: 'FEATURE_DISABLED',
        message: 'Quest Assistant is not enabled for this environment.',
        status: 403,
      }
    }

    if (!input.organizationId) {
      return {
        allowed: false,
        reason: 'ORGANIZATION_REQUIRED',
        message: 'Quest Assistant requires an active organization subscription.',
        status: 402,
      }
    }

    const context = await this.repository.getOrganizationContextForUser(
      input.userId,
      input.organizationId
    )

    if (!context) {
      return {
        allowed: false,
        reason: 'ORGANIZATION_FORBIDDEN',
        message: 'Insufficient organization permissions.',
        status: 403,
      }
    }

    if (!context.subscription) {
      return {
        allowed: false,
        reason: 'SUBSCRIPTION_REQUIRED',
        message: 'Quest Assistant requires a Professional or Enterprise subscription.',
        status: 402,
      }
    }

    if (!this.config.allowedPlans.includes(context.subscription.plan)) {
      return {
        allowed: false,
        reason: 'PLAN_NOT_ALLOWED',
        message: 'Quest Assistant is available on Professional and Enterprise plans.',
        status: 402,
        details: {
          plan: context.subscription.plan,
          requiredPlans: this.config.allowedPlans,
        },
      }
    }

    if (!this.config.allowedStatuses.includes(context.subscription.status)) {
      return {
        allowed: false,
        reason: 'SUBSCRIPTION_NOT_ACTIVE',
        message: 'Quest Assistant requires an active subscription or active trial.',
        status: 402,
        details: {
          status: context.subscription.status,
          allowedStatuses: this.config.allowedStatuses,
        },
      }
    }

    return { allowed: true }
  }
}
