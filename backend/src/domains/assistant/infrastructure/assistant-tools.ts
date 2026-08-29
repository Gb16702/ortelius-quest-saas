import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import { createOpenPageActionInput } from '../application/assistant-actions'
import {
  buildCurrentUserContext,
  buildOrganizationSummaryContext,
  buildSubscriptionTrialContext,
  serializeOrganizationContext,
} from '../application/assistant-context'
import { serializeAssistantRealtimeAction } from '../application/assistant-realtime-events'
import {
  type AssistantStreamEventPublisher,
  type AssistantStreamStatus,
  QUEST_ASSISTANT_ACTION_PROPOSED_EVENT,
  QUEST_ASSISTANT_STATUS_EVENT,
} from '../application/assistant-stream-events'
import type { AssistantOrganizationContext, AssistantRepositoryPort } from '../application/ports'
import {
  canRoleAccessCapability,
  findQuestCapabilityByRoutePath,
  type QuestCapability,
  searchQuestCapabilities,
} from '../application/quest-capability-registry'
import type { StreamAssistantMessageInput } from './assistant-ai.service'

const capabilitySchema = z.object({
  id: z.string(),
  area: z.string(),
  title: z.string(),
  summary: z.string(),
  routePattern: z.string(),
  requiredRole: z.string(),
  planRequirement: z.string(),
  keywords: z.array(z.string()),
  userAccess: z
    .object({
      currentRole: z.string().nullable(),
      allowed: z.boolean(),
      reason: z.string().nullable(),
    })
    .nullable(),
})

const assistantActionSchema = z.object({
  id: z.string(),
  conversationId: z.string().nullable(),
  userId: z.string(),
  organizationId: z.string().nullable(),
  type: z.literal('open_page'),
  status: z.enum(['proposed', 'executed', 'cancelled', 'expired', 'failed']),
  title: z.string(),
  summary: z.string(),
  buttonLabel: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high', 'destructive']),
  requiresConfirmation: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
  preview: z.record(z.string(), z.unknown()).nullable(),
  result: z.record(z.string(), z.unknown()).nullable(),
  errorMessage: z.string().nullable(),
  expiresAt: z.string(),
  confirmedAt: z.string().nullable(),
  executedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ASSISTANT_STATUS_SUBJECT_MAX_LENGTH = 72

const searchAppCapabilitiesDefinition = toolDefinition({
  name: 'search_app_capabilities',
  description:
    'Search Quest app capabilities, settings pages, route targets, permissions, and plan requirements. Use this before answering navigation or "where can I change..." questions. Results include current user access when organization context is available; use that access data to explain permission limits and avoid unavailable action proposals.',
  inputSchema: z.object({
    query: z.string().min(1).max(200),
    limit: z.number().int().min(1).max(10).optional(),
  }),
  outputSchema: z.object({
    capabilities: z.array(capabilitySchema),
  }),
})

const currentUserContextDefinition = toolDefinition({
  name: 'get_current_user_context',
  description:
    'Return the authenticated Quest user context for questions about the current account.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.string(),
    }),
  }),
})

const currentOrganizationContextDefinition = toolDefinition({
  name: 'get_current_organization_context',
  description:
    'Return the current organization context, membership role, subscription summary, and usage counts. Use this for organization, plan, trial, seat, and permission questions.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    organizationContext: z
      .object({
        organization: z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string().nullable(),
          status: z.string(),
          tagline: z.string().nullable(),
        }),
        membership: z.object({
          role: z.string(),
        }),
        subscription: z
          .object({
            plan: z.string(),
            status: z.string(),
            periodEnd: z.string().nullable(),
            trialEnd: z.string().nullable(),
            cancelAtPeriodEnd: z.boolean().nullable(),
          })
          .nullable(),
        usage: z.object({
          memberCount: z.number().int().nonnegative(),
          pendingInvitationCount: z.number().int().nonnegative(),
        }),
      })
      .nullable(),
    reason: z.string().nullable(),
  }),
})

const currentSubscriptionContextDefinition = toolDefinition({
  name: 'get_current_subscription_context',
  description:
    'Return the current organization subscription and trial state. Use this for questions about plan, billing status, trial end date, or remaining trial time.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    subscriptionContext: z
      .object({
        hasSubscription: z.boolean(),
        plan: z.string().nullable(),
        status: z.string().nullable(),
        periodEnd: z.string().nullable(),
        trialEnd: z.string().nullable(),
        trialDaysRemaining: z.number().int().nonnegative().nullable(),
        cancelAtPeriodEnd: z.boolean().nullable(),
      })
      .nullable(),
    reason: z.string().nullable(),
  }),
})

const organizationSummaryDefinition = toolDefinition({
  name: 'get_current_organization_summary',
  description:
    'Return a concise read-only summary of the current organization, the user membership role, member count, pending invitation count, and current plan.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    organizationSummary: z
      .object({
        organization: z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string().nullable(),
          status: z.string(),
          tagline: z.string().nullable(),
        }),
        membership: z.object({
          role: z.string(),
        }),
        usage: z.object({
          memberCount: z.number().int().nonnegative(),
          pendingInvitationCount: z.number().int().nonnegative(),
        }),
        currentPlan: z.string().nullable(),
        currentSubscriptionStatus: z.string().nullable(),
      })
      .nullable(),
    reason: z.string().nullable(),
  }),
})

const proposeAssistantActionDefinition = toolDefinition({
  name: 'propose_assistant_action',
  description:
    'Create a safe assistant action proposal for the current conversation. Use this only when the user has a clear intent, the user has access, and a button would help them proceed. The current supported action type is open_page. If this returns no action, answer the user in text with the reason instead of stopping.',
  inputSchema: z.object({
    type: z.literal('open_page'),
    title: z.string().min(1).max(80),
    summary: z.string().min(1).max(240),
    buttonLabel: z.string().min(1).max(40).optional(),
    payload: z.object({
      routePath: z.string().min(1).max(512),
    }),
  }),
  outputSchema: z.object({
    action: assistantActionSchema.nullable(),
    reason: z.string().nullable(),
  }),
})

export async function normalizeActionRoutePath(input: {
  routePath: string
  request: StreamAssistantMessageInput
  repository: AssistantRepositoryPort
}): Promise<string | { reason: string }> {
  let routePath = input.routePath.trim()
  const organizationId = input.request.context?.organizationId

  if (
    routePath.includes(':slug') ||
    (organizationId && routePath.includes(`/org/${organizationId}`))
  ) {
    if (!organizationId) {
      return { reason: 'No organization context was provided to resolve the route slug.' }
    }

    const context = await input.repository.getOrganizationContextForUser(
      input.request.user.id,
      organizationId
    )

    if (!context?.organization.slug) {
      return { reason: 'The current organization slug is unavailable.' }
    }

    routePath = routePath.split(':slug').join(context.organization.slug)
    routePath = routePath.split(`/org/${organizationId}`).join(`/org/${context.organization.slug}`)
  }

  return routePath
}

export function createAssistantTools(
  input: StreamAssistantMessageInput,
  repository: AssistantRepositoryPort,
  events?: AssistantStreamEventPublisher
) {
  const searchAppCapabilities = searchAppCapabilitiesDefinition.server(async ({ query, limit }) => {
    publishStatus(events, createCapabilitySearchStatus(query))
    const organizationContext = await getRequestOrganizationContext(input, repository)

    return {
      capabilities: searchQuestCapabilities({ query, limit }).map((capability) =>
        serializeCapabilityForUser(capability, organizationContext)
      ),
    }
  })

  const getCurrentUserContext = currentUserContextDefinition.server(async () => {
    publishStatus(events, createCurrentUserStatus(input.user))

    return buildCurrentUserContext(input.user)
  })

  const getCurrentOrganizationContext = currentOrganizationContextDefinition.server(async () => {
    const organizationId = input.context?.organizationId

    if (!organizationId) {
      publishStatus(events, createMissingOrganizationStatus())

      return {
        organizationContext: null,
        reason: 'No organization context was provided for the current assistant request.',
      }
    }

    const context = await repository.getOrganizationContextForUser(input.user.id, organizationId)
    publishStatus(events, createOrganizationContextStatus(context))

    return {
      organizationContext: context ? serializeOrganizationContext(context) : null,
      reason: context ? null : 'The current user cannot access this organization.',
    }
  })

  const getCurrentSubscriptionContext = currentSubscriptionContextDefinition.server(async () => {
    const organizationId = input.context?.organizationId

    if (!organizationId) {
      publishStatus(events, createMissingPlanStatus())

      return {
        subscriptionContext: null,
        reason: 'No organization context was provided for the current assistant request.',
      }
    }

    const context = await repository.getOrganizationContextForUser(input.user.id, organizationId)
    publishStatus(events, createSubscriptionContextStatus(context))

    return {
      subscriptionContext: context ? buildSubscriptionTrialContext(context) : null,
      reason: context ? null : 'The current user cannot access this organization.',
    }
  })

  const getCurrentOrganizationSummary = organizationSummaryDefinition.server(async () => {
    const organizationId = input.context?.organizationId

    if (!organizationId) {
      publishStatus(events, createMissingOrganizationStatus())

      return {
        organizationSummary: null,
        reason: 'No organization context was provided for the current assistant request.',
      }
    }

    const context = await repository.getOrganizationContextForUser(input.user.id, organizationId)
    publishStatus(events, createOrganizationSummaryStatus(context))

    return {
      organizationSummary: context ? buildOrganizationSummaryContext(context) : null,
      reason: context ? null : 'The current user cannot access this organization.',
    }
  })

  const proposeAssistantAction = proposeAssistantActionDefinition.server(
    async ({ type, title, summary, buttonLabel, payload }) => {
      if (type !== 'open_page') {
        return {
          action: null,
          reason: 'Unsupported assistant action type.',
        }
      }

      if (!input.conversationId) {
        return {
          action: null,
          reason: 'Assistant actions require a persisted conversation.',
        }
      }

      const routePath = await normalizeActionRoutePath({
        routePath: payload.routePath,
        request: input,
        repository,
      })

      if (typeof routePath !== 'string') {
        return {
          action: null,
          reason: routePath.reason,
        }
      }

      const routeAccess = await checkRouteAccessForUser({
        routePath,
        request: input,
        repository,
      })

      if (!routeAccess.allowed) {
        return {
          action: null,
          reason: routeAccess.reason,
        }
      }

      const actionInput = createOpenPageActionInput({
        conversationId: input.conversationId,
        userId: input.user.id,
        organizationId: input.context?.organizationId,
        routePath,
        title,
        summary,
        buttonLabel,
      })

      if ('reason' in actionInput) {
        return {
          action: null,
          reason: actionInput.reason,
        }
      }

      publishStatus(
        events,
        createActionPreparationStatus({
          routePath,
          summary,
          title,
        })
      )

      const action = await repository.createAction(actionInput)
      const serializedAction = serializeAssistantRealtimeAction(action)

      events?.publish({
        name: QUEST_ASSISTANT_ACTION_PROPOSED_EVENT,
        value: {
          action: serializedAction,
        },
      })

      return {
        action: serializedAction,
        reason: null,
      }
    }
  )

  return [
    searchAppCapabilities,
    getCurrentUserContext,
    getCurrentOrganizationContext,
    getCurrentSubscriptionContext,
    getCurrentOrganizationSummary,
    proposeAssistantAction,
  ]
}

function publishStatus(
  events: AssistantStreamEventPublisher | undefined,
  status: AssistantStreamStatus
) {
  events?.publish({
    name: QUEST_ASSISTANT_STATUS_EVENT,
    value: status,
  })
}

function createCapabilitySearchStatus(query: string): AssistantStreamStatus {
  const subject = formatStatusSubject(query)

  return {
    label: `Finding a match for ${subject}`,
    body: `I'm searching Quest for ${subject} so I can route the request to the right page, setting, or permission.`,
  }
}

function createCurrentUserStatus(user: StreamAssistantMessageInput['user']): AssistantStreamStatus {
  const userName = normalizeStatusText(user.name) || 'this user'
  const userRole = normalizeStatusText(user.role) || 'current'

  return {
    label: `Checking ${formatPossessive(userName)} account`,
    body: `I'm using ${formatPossessive(userName)} ${userRole} account context so the answer matches their access.`,
  }
}

function createMissingOrganizationStatus(): AssistantStreamStatus {
  return {
    label: 'Checking the current workspace',
    body: "I'm trying to load the current workspace context before answering.",
  }
}

function createOrganizationContextStatus(
  context: AssistantOrganizationContext | null
): AssistantStreamStatus {
  if (!context) {
    return {
      label: 'Checking the current workspace',
      body: "I'm checking whether this user can access the current workspace before answering.",
    }
  }

  const organizationName = normalizeStatusText(context.organization.name) || 'this workspace'
  const role = normalizeStatusText(context.membership.role) || 'current'

  return {
    label: `Checking ${organizationName}`,
    body: `I'm using ${formatPossessive(organizationName)} workspace context and the ${role} role before answering.`,
  }
}

function createOrganizationSummaryStatus(
  context: AssistantOrganizationContext | null
): AssistantStreamStatus {
  if (!context) {
    return {
      label: 'Checking the current workspace',
      body: "I'm checking whether this user can access the current workspace summary before answering.",
    }
  }

  const organizationName = normalizeStatusText(context.organization.name) || 'this workspace'
  const role = normalizeStatusText(context.membership.role) || 'current'

  return {
    label: `Checking ${organizationName}`,
    body: `I'm reading ${formatPossessive(organizationName)} workspace summary, ${role} role, and usage before answering.`,
  }
}

function createMissingPlanStatus(): AssistantStreamStatus {
  return {
    label: 'Checking the current plan',
    body: "I'm trying to load the current workspace plan before explaining access or limits.",
  }
}

function createSubscriptionContextStatus(
  context: AssistantOrganizationContext | null
): AssistantStreamStatus {
  if (!context) {
    return {
      label: 'Checking the current plan',
      body: "I'm checking whether this user can access the current workspace plan before answering.",
    }
  }

  const organizationName = normalizeStatusText(context.organization.name) || 'this workspace'
  const plan = normalizeStatusText(context.subscription?.plan ?? null)
  const status = normalizeStatusText(context.subscription?.status ?? null)
  const planSummary = plan ? `${plan}${status ? ` (${status})` : ''}` : 'plan'

  return {
    label: `Checking ${formatPossessive(organizationName)} plan`,
    body: `I'm checking ${formatPossessive(organizationName)} ${planSummary} before explaining access, billing, or limits.`,
  }
}

function createActionPreparationStatus(input: {
  title: string
  summary: string
  routePath: string
}): AssistantStreamStatus {
  const title = normalizeStatusText(input.title) || 'this action'
  const summary = normalizeStatusText(input.summary)
  const routeTarget = formatRouteTarget(input.routePath)

  return {
    label: `Preparing ${formatStatusSubject(title)}`,
    body: summary
      ? `I'm validating access and preparing "${summary}"${routeTarget ? ` for ${routeTarget}` : ''} before showing the confirmation card.`
      : `I'm validating access and preparing ${formatStatusSubject(title)}${routeTarget ? ` for ${routeTarget}` : ''} before showing the confirmation card.`,
  }
}

function formatStatusSubject(value: string): string {
  const normalizedValue = normalizeStatusText(value)
  if (!normalizedValue) return 'this request'

  return `"${truncateStatusText(normalizedValue)}"`
}

function formatRouteTarget(routePath: string): string | null {
  const normalizedRoutePath = normalizeStatusText(routePath)
  if (!normalizedRoutePath) return null

  const routeParts = normalizedRoutePath.split('/').filter(Boolean)
  const lastRoutePart = routeParts.at(-1)
  if (!lastRoutePart) return normalizedRoutePath

  return lastRoutePart.split('-').filter(Boolean).join(' ')
}

function formatPossessive(value: string): string {
  return value.endsWith('s') ? `${value}'` : `${value}'s`
}

function normalizeStatusText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

function truncateStatusText(value: string): string {
  return value.length > ASSISTANT_STATUS_SUBJECT_MAX_LENGTH
    ? `${value.slice(0, ASSISTANT_STATUS_SUBJECT_MAX_LENGTH - 1)}...`
    : value
}

async function getRequestOrganizationContext(
  input: StreamAssistantMessageInput,
  repository: AssistantRepositoryPort
): Promise<AssistantOrganizationContext | null> {
  const organizationId = input.context?.organizationId
  if (!organizationId) return null

  return repository.getOrganizationContextForUser(input.user.id, organizationId)
}

function serializeCapabilityForUser(
  capability: QuestCapability,
  organizationContext: AssistantOrganizationContext | null
) {
  const currentRole = organizationContext?.membership.role ?? null
  const allowed = canRoleAccessCapability({ role: currentRole, capability })

  return {
    ...capability,
    userAccess: {
      currentRole,
      allowed,
      reason: allowed ? null : `This page requires the ${capability.requiredRole} role or higher.`,
    },
  }
}

async function checkRouteAccessForUser(input: {
  routePath: string
  request: StreamAssistantMessageInput
  repository: AssistantRepositoryPort
}): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const capability = findQuestCapabilityByRoutePath(input.routePath)
  if (!capability) {
    return {
      allowed: false,
      reason: `No registered Quest page matches ${input.routePath}. Search the capability map and propose one of its routePattern values instead.`,
    }
  }

  const organizationContext = await getRequestOrganizationContext(input.request, input.repository)
  const allowed = canRoleAccessCapability({
    role: organizationContext?.membership.role ?? null,
    capability,
  })

  if (allowed) return { allowed: true }

  return {
    allowed: false,
    reason: `This action requires the ${capability.requiredRole} role or higher.`,
  }
}
