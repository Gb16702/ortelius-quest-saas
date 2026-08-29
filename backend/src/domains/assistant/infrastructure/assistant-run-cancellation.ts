export const ASSISTANT_RUN_CANCELLED_CODE = 'run_cancelled'

export class AssistantRunCancelledError extends Error {
  readonly code = ASSISTANT_RUN_CANCELLED_CODE

  constructor(message = 'Assistant generation stopped') {
    super(message)
    this.name = 'AssistantRunCancelledError'
  }
}

export type AssistantRunCancellationResult =
  | {
      status: 'cancelled'
      conversationId: string
      runId: string
      source: 'active' | 'pending' | 'processing'
    }
  | {
      status: 'forbidden'
    }
  | {
      status: 'not_found'
    }

export interface AssistantRunCancellationRegistryPort {
  register(input: {
    abort: () => void
    conversationId: string
    runId: string
    userId: string
  }): () => void
  cancelRun(input: { runId: string; userId: string }): AssistantRunCancellationResult
}

interface ActiveAssistantRun {
  abort: () => void
  conversationId: string
  runId: string
  userId: string
}

export class InMemoryAssistantRunCancellationRegistry
  implements AssistantRunCancellationRegistryPort
{
  private readonly activeRuns = new Map<string, ActiveAssistantRun>()

  register(input: ActiveAssistantRun): () => void {
    this.activeRuns.set(input.runId, input)

    return () => {
      if (this.activeRuns.get(input.runId) !== input) return
      this.activeRuns.delete(input.runId)
    }
  }

  cancelRun(input: { runId: string; userId: string }): AssistantRunCancellationResult {
    const activeRun = this.activeRuns.get(input.runId)
    if (!activeRun) return { status: 'not_found' }

    if (activeRun.userId !== input.userId) {
      return { status: 'forbidden' }
    }

    activeRun.abort()

    return {
      status: 'cancelled',
      conversationId: activeRun.conversationId,
      runId: activeRun.runId,
      source: 'active',
    }
  }
}

export function isAssistantRunCancelledError(error: unknown): error is AssistantRunCancelledError {
  return error instanceof AssistantRunCancelledError
}

export const assistantRunCancellationRegistry = new InMemoryAssistantRunCancellationRegistry()
