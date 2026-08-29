import { z } from 'zod'
import type { AssistantAction } from './assistant-models'
import type { AssistantRepositoryPort, CreateAssistantActionInput } from './ports'

const ACTION_TTL_MS = 15 * 60 * 1000

const openPagePayloadSchema = z.object({
  routePath: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
      message: 'Route path must be a relative Quest path.',
    })
    .refine((value) => !value.includes('://'), {
      message: 'Route path must not be an absolute URL.',
    }),
})

export interface AssistantActionFailure {
  ok: false
  status: 400 | 403 | 404 | 409
  code: 'BAD_REQUEST' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT'
  message: string
  details?: Record<string, unknown>
}

export interface AssistantActionSuccess {
  ok: true
  action: AssistantAction
}

export type AssistantActionResult = AssistantActionSuccess | AssistantActionFailure

export function buildActionExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + ACTION_TTL_MS)
}

export function isActionExpired(action: AssistantAction, now = new Date()): boolean {
  return action.expiresAt.getTime() <= now.getTime()
}

export function validateOpenPagePayload(payload: Record<string, unknown>) {
  return openPagePayloadSchema.safeParse(payload)
}

export function normalizeQuestRoutePath(routePath: string): string | null {
  const trimmed = routePath.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return null
  }

  return trimmed
}

export function createOpenPageActionInput(input: {
  conversationId: string
  userId: string
  organizationId?: string
  routePath: string
  title: string
  summary: string
  buttonLabel?: string
}): CreateAssistantActionInput | { reason: string } {
  const routePath = normalizeQuestRoutePath(input.routePath)

  if (!routePath) {
    return { reason: 'The route path must be a relative Quest route.' }
  }

  return {
    conversationId: input.conversationId,
    userId: input.userId,
    organizationId: input.organizationId,
    type: 'open_page',
    title: input.title,
    summary: input.summary,
    buttonLabel: input.buttonLabel ?? 'Open page',
    riskLevel: 'low',
    requiresConfirmation: true,
    payload: { routePath },
    preview: { routePath },
    expiresAt: buildActionExpiresAt(),
  }
}

export class AssistantActionService {
  constructor(private readonly repository: AssistantRepositoryPort) {}

  async confirmAction(input: { actionId: string; userId: string }): Promise<AssistantActionResult> {
    const action = await this.repository.findActionForUser(input.actionId, input.userId)

    if (!action) {
      return {
        ok: false,
        status: 404,
        code: 'NOT_FOUND',
        message: 'Assistant action not found',
      }
    }

    if (action.status !== 'proposed') {
      return {
        ok: false,
        status: 409,
        code: 'CONFLICT',
        message: `Assistant action cannot be confirmed from status ${action.status}.`,
        details: { status: action.status },
      }
    }

    if (isActionExpired(action)) {
      const expiredAction = await this.repository.updateAction({
        actionId: action.id,
        userId: input.userId,
        status: 'expired',
      })

      return {
        ok: false,
        status: 409,
        code: 'CONFLICT',
        message: 'Assistant action has expired.',
        details: { action: expiredAction ?? action },
      }
    }

    if (
      action.organizationId &&
      !(await this.repository.userCanAccessOrganization(input.userId, action.organizationId))
    ) {
      return {
        ok: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient organization permissions',
      }
    }

    if (action.type !== 'open_page') {
      const failedAction = await this.repository.updateAction({
        actionId: action.id,
        userId: input.userId,
        status: 'failed',
        errorMessage: 'Unsupported assistant action type.',
      })

      return {
        ok: false,
        status: 409,
        code: 'CONFLICT',
        message: 'Unsupported assistant action type.',
        details: { action: failedAction ?? action },
      }
    }

    const payload = validateOpenPagePayload(action.payload)

    if (!payload.success) {
      const failedAction = await this.repository.updateAction({
        actionId: action.id,
        userId: input.userId,
        status: 'failed',
        errorMessage: 'Invalid open page action payload.',
      })

      return {
        ok: false,
        status: 409,
        code: 'CONFLICT',
        message: 'Assistant action payload is invalid.',
        details: { action: failedAction ?? action },
      }
    }

    const now = new Date()
    const executedAction = await this.repository.updateAction({
      actionId: action.id,
      userId: input.userId,
      status: 'executed',
      confirmedAt: now,
      executedAt: now,
      result: {
        type: 'open_page',
        routePath: payload.data.routePath,
      },
    })

    return {
      ok: true,
      action: executedAction ?? action,
    }
  }

  async cancelAction(input: { actionId: string; userId: string }): Promise<AssistantActionResult> {
    const action = await this.repository.findActionForUser(input.actionId, input.userId)

    if (!action) {
      return {
        ok: false,
        status: 404,
        code: 'NOT_FOUND',
        message: 'Assistant action not found',
      }
    }

    if (action.status !== 'proposed') {
      return {
        ok: false,
        status: 409,
        code: 'CONFLICT',
        message: `Assistant action cannot be cancelled from status ${action.status}.`,
        details: { status: action.status },
      }
    }

    const cancelledAction = await this.repository.updateAction({
      actionId: action.id,
      userId: input.userId,
      status: 'cancelled',
      cancelledAt: new Date(),
    })

    return {
      ok: true,
      action: cancelledAction ?? action,
    }
  }
}
