import type { AuthUser } from '../../auth/application/auth-models'
import type { AssistantOrganizationContext } from './ports'

export interface SerializableAssistantOrganizationContext {
  organization: {
    id: string
    name: string
    slug: string | null
    status: string
    tagline: string | null
  }
  membership: {
    role: string
  }
  subscription: {
    plan: string
    status: string
    periodEnd: string | null
    trialEnd: string | null
    cancelAtPeriodEnd: boolean | null
  } | null
  usage: {
    memberCount: number
    pendingInvitationCount: number
  }
}

export interface AssistantSubscriptionTrialContext {
  hasSubscription: boolean
  plan: string | null
  status: string | null
  periodEnd: string | null
  trialEnd: string | null
  trialDaysRemaining: number | null
  cancelAtPeriodEnd: boolean | null
}

export interface AssistantOrganizationSummaryContext {
  organization: SerializableAssistantOrganizationContext['organization']
  membership: SerializableAssistantOrganizationContext['membership']
  usage: SerializableAssistantOrganizationContext['usage']
  currentPlan: string | null
  currentSubscriptionStatus: string | null
}

export function buildCurrentUserContext(user: AuthUser) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  }
}

export function buildSubscriptionTrialContext(
  context: AssistantOrganizationContext,
  now = new Date()
): AssistantSubscriptionTrialContext {
  if (!context.subscription) {
    return {
      hasSubscription: false,
      plan: null,
      status: null,
      periodEnd: null,
      trialEnd: null,
      trialDaysRemaining: null,
      cancelAtPeriodEnd: null,
    }
  }

  const trialDaysRemaining = context.subscription.trialEnd
    ? Math.max(0, Math.ceil((context.subscription.trialEnd.getTime() - now.getTime()) / 86_400_000))
    : null

  return {
    hasSubscription: true,
    plan: context.subscription.plan,
    status: context.subscription.status,
    periodEnd: context.subscription.periodEnd?.toISOString() ?? null,
    trialEnd: context.subscription.trialEnd?.toISOString() ?? null,
    trialDaysRemaining,
    cancelAtPeriodEnd: context.subscription.cancelAtPeriodEnd,
  }
}

export function buildOrganizationSummaryContext(
  context: AssistantOrganizationContext
): AssistantOrganizationSummaryContext {
  return {
    organization: context.organization,
    membership: context.membership,
    usage: context.usage,
    currentPlan: context.subscription?.plan ?? null,
    currentSubscriptionStatus: context.subscription?.status ?? null,
  }
}

export function serializeOrganizationContext(
  context: AssistantOrganizationContext
): SerializableAssistantOrganizationContext {
  return {
    organization: context.organization,
    membership: context.membership,
    subscription: context.subscription
      ? {
          plan: context.subscription.plan,
          status: context.subscription.status,
          periodEnd: context.subscription.periodEnd?.toISOString() ?? null,
          trialEnd: context.subscription.trialEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: context.subscription.cancelAtPeriodEnd,
        }
      : null,
    usage: context.usage,
  }
}
