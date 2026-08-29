import { describe, expect, it, mock } from 'bun:test'
import {
  CallLifecycleError,
  createCallLifecycleUseCases,
  type VoipCallRepository,
} from '../application/call-lifecycle.use-cases'
import type { CallRecord } from '../domain/calls.types'

const baseCall: CallRecord = {
  id: 'call-1',
  conversationId: 'conv-1',
  callerId: 'caller-1',
  calleeId: 'callee-1',
  callType: 'video',
  status: 'pending',
  startedAt: new Date('2026-05-07T10:00:00.000Z'),
  endedAt: null,
  duration: null,
  endedBy: null,
  recordingUrl: null,
  transcriptId: null,
  metadata: null,
}

function createRepository(overrides: Partial<VoipCallRepository> = {}): VoipCallRepository {
  return {
    create: mock(async () => baseCall),
    findById: mock(async () => baseCall),
    update: mock(async (_callId, patch) => ({ ...baseCall, ...patch })),
    findActiveForUser: mock(async () => []),
    findHistory: mock(async () => ({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    })),
    isUserMemberOfConversationOrg: mock(async () => false),
    ...overrides,
  }
}

describe('Call lifecycle use cases', () => {
  it('rejects self calls before writing to the repository', async () => {
    const repository = createRepository()
    const events = { publish: mock(() => undefined) }
    const useCases = createCallLifecycleUseCases({ repository, events })

    await expect(
      useCases.initiate({
        callerId: 'user-1',
        calleeId: 'user-1',
        conversationId: 'conv-1',
        callType: 'audio',
      })
    ).rejects.toThrow(CallLifecycleError)

    expect(repository.create).not.toHaveBeenCalled()
    expect(events.publish).not.toHaveBeenCalled()
  })

  it('accepts org calls for conversation organization members', async () => {
    const repository = createRepository({
      findById: mock(async () => ({ ...baseCall, calleeId: null })),
      isUserMemberOfConversationOrg: mock(async () => true),
    })
    const events = { publish: mock(() => undefined) }
    const useCases = createCallLifecycleUseCases({ repository, events })

    const call = await useCases.accept('call-1', 'member-1')

    expect(call.status).toBe('active')
    expect(repository.update).toHaveBeenCalledWith('call-1', {
      status: 'active',
      calleeId: 'member-1',
    })
    expect(events.publish).toHaveBeenCalled()
  })
})
