import type { ChatMiddleware, ToolCallHookContext, UsageInfo } from '@tanstack/ai'
import { contentGuardMiddleware, toolCacheMiddleware } from '@tanstack/ai/middlewares'
import {
  type AssistantStreamEventPublisher,
  type AssistantStreamStatus,
  QUEST_ASSISTANT_STATUS_EVENT,
} from '../application/assistant-stream-events'

export const QUEST_ASSISTANT_READ_ONLY_TOOL_NAMES = [
  'search_app_capabilities',
  'get_current_user_context',
  'get_current_organization_context',
  'get_current_subscription_context',
  'get_current_organization_summary',
] as const

const REVIEWING_LATEST_RESULT_STATUS: AssistantStreamStatus = {
  label: 'Reviewing the latest result',
  body: 'I am checking the latest tool result before deciding whether to continue, finish, or ask for confirmation.',
}

export interface AssistantRunControlLimits {
  maxToolCalls: number
  maxTotalTokens: number
  maxRunDurationMs: number
}

export interface AssistantRunBudgetSnapshot {
  iterations: number
  toolCalls: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  durationMs: number
  exceededReasons: string[]
}

export interface AssistantRunControlOptions {
  limits: AssistantRunControlLimits
  events?: AssistantStreamEventPublisher
  now?: () => number
}

export interface AssistantRunControl {
  middleware: ChatMiddleware
  getSnapshot(): AssistantRunBudgetSnapshot
}

export function createAssistantRunControl(
  options: AssistantRunControlOptions
): AssistantRunControl {
  const now = options.now ?? Date.now
  const startedAt = now()
  const exceededReasons = new Set<string>()
  let iterations = 0
  let toolCalls = 0
  let promptTokens = 0
  let completionTokens = 0
  let totalTokens = 0

  const recordUsage = (usage: UsageInfo) => {
    promptTokens += usage.promptTokens
    completionTokens += usage.completionTokens
    totalTokens += usage.totalTokens
  }

  const getSnapshot = (): AssistantRunBudgetSnapshot => ({
    iterations,
    toolCalls,
    promptTokens,
    completionTokens,
    totalTokens,
    durationMs: now() - startedAt,
    exceededReasons: [...exceededReasons],
  })

  const middleware: ChatMiddleware = {
    name: 'quest-assistant-run-controls',

    onIteration(_ctx, info) {
      iterations = Math.max(iterations, info.iteration + 1)

      if (info.iteration > 0) {
        publishStatus(options.events, REVIEWING_LATEST_RESULT_STATUS)
      }
    },

    onBeforeToolCall(ctx, hookCtx) {
      if (isRunDurationExceeded({ now, startedAt, limits: options.limits })) {
        exceededReasons.add('duration')
        return skipToolWithBudgetResult(hookCtx, 'The assistant run time budget was reached.')
      }

      if (totalTokens >= options.limits.maxTotalTokens) {
        exceededReasons.add('tokens')
        return skipToolWithBudgetResult(hookCtx, 'The assistant token budget was reached.')
      }

      if (toolCalls >= options.limits.maxToolCalls) {
        exceededReasons.add('tool_calls')
        return skipToolWithBudgetResult(hookCtx, 'The assistant tool-call budget was reached.')
      }

      toolCalls += 1

      if (isRunDurationExceeded({ now, startedAt, limits: options.limits })) {
        exceededReasons.add('duration')
        ctx.abort('Assistant run time budget reached.')
      }

      return undefined
    },

    onUsage(ctx, usage) {
      recordUsage(usage)

      if (totalTokens >= options.limits.maxTotalTokens) {
        exceededReasons.add('tokens')
        ctx.abort('Assistant token budget reached.')
      }
    },

    onChunk(ctx) {
      if (!isRunDurationExceeded({ now, startedAt, limits: options.limits })) return

      exceededReasons.add('duration')
      ctx.abort('Assistant run time budget reached.')
    },
  }

  return { middleware, getSnapshot }
}

export function createAssistantToolCacheMiddleware(): ChatMiddleware {
  return toolCacheMiddleware({
    ttl: 30_000,
    maxSize: 50,
    toolNames: [...QUEST_ASSISTANT_READ_ONLY_TOOL_NAMES],
  })
}

export function createAssistantContentGuardMiddleware(): ChatMiddleware {
  return contentGuardMiddleware({
    strategy: 'buffered',
    bufferSize: 64,
    rules: [
      {
        pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
        replacement: '[REDACTED_SECRET]',
      },
      {
        pattern: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/g,
        replacement: 'Bearer [REDACTED_SECRET]',
      },
      {
        pattern: /\bAKIA[0-9A-Z]{16}\b/g,
        replacement: '[REDACTED_SECRET]',
      },
      {
        pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
        replacement: '[REDACTED_PRIVATE_KEY]',
      },
    ],
  })
}

function skipToolWithBudgetResult(hookCtx: ToolCallHookContext, reason: string) {
  return {
    type: 'skip' as const,
    result: {
      ok: false,
      toolName: hookCtx.toolName,
      reason,
      instruction: 'Stop calling tools for this request and answer with the available context.',
    },
  }
}

function isRunDurationExceeded(input: {
  now: () => number
  startedAt: number
  limits: AssistantRunControlLimits
}) {
  return input.now() - input.startedAt >= input.limits.maxRunDurationMs
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
