import { describe, expect, it, mock } from 'bun:test'
import type {
  ChatMiddlewareContext,
  StreamChunk,
  ToolCallHookContext,
  UsageInfo,
} from '@tanstack/ai'
import { QUEST_ASSISTANT_STATUS_EVENT } from '../application/assistant-stream-events'
import {
  createAssistantContentGuardMiddleware,
  createAssistantRunControl,
  createAssistantToolCacheMiddleware,
} from '../infrastructure/assistant-run-controls'

describe('Assistant run controls', () => {
  it('skips additional tool calls after the per-run tool budget is reached', async () => {
    const control = createAssistantRunControl({
      limits: {
        maxToolCalls: 1,
        maxTotalTokens: 10_000,
        maxRunDurationMs: 30_000,
      },
      now: () => 0,
    })
    const ctx = createMiddlewareContext()
    const firstDecision = await control.middleware.onBeforeToolCall?.(ctx, createToolHookContext())
    const secondDecision = await control.middleware.onBeforeToolCall?.(ctx, createToolHookContext())

    expect(firstDecision).toBeUndefined()
    expect(secondDecision).toEqual({
      type: 'skip',
      result: expect.objectContaining({
        ok: false,
        reason: 'The assistant tool-call budget was reached.',
      }),
    })
    expect(control.getSnapshot()).toEqual(
      expect.objectContaining({
        toolCalls: 1,
        exceededReasons: ['tool_calls'],
      })
    )
  })

  it('aborts the run when reported usage reaches the token budget', async () => {
    const abort = mock(() => undefined)
    const control = createAssistantRunControl({
      limits: {
        maxToolCalls: 10,
        maxTotalTokens: 100,
        maxRunDurationMs: 30_000,
      },
      now: () => 0,
    })

    await control.middleware.onUsage?.(
      createMiddlewareContext({ abort }),
      createUsage({ promptTokens: 80, completionTokens: 30, totalTokens: 110 })
    )

    expect(abort).toHaveBeenCalledWith('Assistant token budget reached.')
    expect(control.getSnapshot()).toEqual(
      expect.objectContaining({
        promptTokens: 80,
        completionTokens: 30,
        totalTokens: 110,
        exceededReasons: ['tokens'],
      })
    )
  })

  it('skips tools when the run duration budget is already reached', async () => {
    let currentTime = 0
    const control = createAssistantRunControl({
      limits: {
        maxToolCalls: 10,
        maxTotalTokens: 10_000,
        maxRunDurationMs: 1_000,
      },
      now: () => currentTime,
    })
    currentTime = 1_001

    const decision = await control.middleware.onBeforeToolCall?.(
      createMiddlewareContext(),
      createToolHookContext()
    )

    expect(decision).toEqual({
      type: 'skip',
      result: expect.objectContaining({
        ok: false,
        reason: 'The assistant run time budget was reached.',
      }),
    })
    expect(control.getSnapshot()).toEqual(
      expect.objectContaining({
        toolCalls: 0,
        exceededReasons: ['duration'],
      })
    )
  })

  it('publishes a status when the agent starts a re-planning iteration', async () => {
    const publish = mock(() => undefined)
    const control = createAssistantRunControl({
      limits: {
        maxToolCalls: 10,
        maxTotalTokens: 10_000,
        maxRunDurationMs: 30_000,
      },
      events: { publish },
      now: () => 0,
    })

    await control.middleware.onIteration?.(createMiddlewareContext(), {
      iteration: 1,
      messageId: 'message-2',
    })

    expect(publish).toHaveBeenCalledWith({
      name: QUEST_ASSISTANT_STATUS_EVENT,
      value: {
        body: 'I am checking the latest tool result before deciding whether to continue, finish, or ask for confirmation.',
        label: 'Reviewing the latest result',
      },
    })
    expect(control.getSnapshot()).toEqual(expect.objectContaining({ iterations: 2 }))
  })

  it('caches only read-only tools', () => {
    const middleware = createAssistantToolCacheMiddleware()

    expect(middleware.name).toBe('tool-cache-middleware')
  })

  it('redacts obvious secrets from streamed text', async () => {
    const middleware = createAssistantContentGuardMiddleware()
    const chunk = await middleware.onChunk?.(createMiddlewareContext(), {
      type: 'TEXT_MESSAGE_CONTENT',
      messageId: 'message-1',
      delta: 'Token sk-abcdefghijklmnopqrstuvwxyz123456 should not leak.',
    } as StreamChunk)
    const flushedChunk = await middleware.onChunk?.(createMiddlewareContext(), {
      type: 'RUN_FINISHED',
      threadId: 'thread-1',
      runId: 'run-1',
    } as StreamChunk)

    expect(chunk).toBeNull()
    expect(flushedChunk).toEqual([
      expect.objectContaining({
        delta: expect.stringContaining('[REDACTED_SECRET]'),
      }),
      expect.objectContaining({
        type: 'RUN_FINISHED',
      }),
    ])
  })
})

function createMiddlewareContext(input?: {
  abort?: ChatMiddlewareContext['abort']
}): ChatMiddlewareContext {
  return {
    requestId: 'request-1',
    streamId: 'stream-1',
    runId: 'run-1',
    threadId: 'thread-1',
    conversationId: 'thread-1',
    phase: 'modelStream',
    iteration: 0,
    chunkIndex: 0,
    abort: input?.abort ?? (() => undefined),
    context: undefined,
    defer: () => undefined,
    provider: 'openai',
    model: 'gpt-5-nano',
    source: 'server',
    streaming: true,
    systemPrompts: [],
    options: undefined,
    modelOptions: undefined,
    messageCount: 1,
    hasTools: true,
    currentMessageId: 'message-1',
    accumulatedContent: '',
    messages: [],
    createId: (prefix) => `${prefix}-1`,
  } satisfies ChatMiddlewareContext
}

function createToolHookContext(): ToolCallHookContext {
  return {
    toolCall: {
      id: 'tool-call-1',
      type: 'function',
      function: {
        name: 'search_app_capabilities',
        arguments: '{}',
      },
    },
    tool: undefined,
    args: {},
    toolName: 'search_app_capabilities',
    toolCallId: 'tool-call-1',
  } as ToolCallHookContext
}

function createUsage(input: UsageInfo): UsageInfo {
  return input
}
