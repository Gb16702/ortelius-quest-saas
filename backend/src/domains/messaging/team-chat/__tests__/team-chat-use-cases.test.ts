import { describe, expect, it, mock } from 'bun:test'
import type { TeamChatMessagePort, TeamChatRepositoryPort } from '../application/ports'
import {
  NotifyTeamChatSettingChangeUseCase,
  SendTeamChatNotificationUseCase,
  ShareRequestToTeamChatUseCase,
} from '../application/team-chat-use-cases'

function makeRepository(overrides: Partial<TeamChatRepositoryPort> = {}): TeamChatRepositoryPort {
  return {
    getTeamChatId: mock(async () => 'team-chat-1'),
    getUserName: mock(async () => 'Ada'),
    ...overrides,
  }
}

function makeMessages(): TeamChatMessagePort {
  return {
    createSystemMessage: mock(async (input) => ({
      id: 'msg-1',
      conversationId: input.conversationId,
      senderId: input.senderId,
      content: input.content,
      messageType: 'system',
      replyToId: null,
      metadata: input.metadata ?? null,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })),
  }
}

describe('Team chat use cases', () => {
  it('sends notifications to the team chat conversation', async () => {
    const repository = makeRepository()
    const messages = makeMessages()
    const result = await new SendTeamChatNotificationUseCase(repository, messages).execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      content: 'Hello',
    })

    expect(result?.conversationId).toBe('team-chat-1')
    expect(messages.createSystemMessage).toHaveBeenCalledWith({
      conversationId: 'team-chat-1',
      senderId: 'user-1',
      content: 'Hello',
      metadata: undefined,
    })
  })

  it('returns null when no team chat exists', async () => {
    const repository = makeRepository({ getTeamChatId: mock(async () => null) })
    const messages = makeMessages()
    const result = await new SendTeamChatNotificationUseCase(repository, messages).execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      content: 'Hello',
    })

    expect(result).toBeNull()
    expect(messages.createSystemMessage).not.toHaveBeenCalled()
  })

  it('builds setting and request messages with actor names from repository', async () => {
    const repository = makeRepository()
    const messages = makeMessages()
    const sender = new SendTeamChatNotificationUseCase(repository, messages)

    await new NotifyTeamChatSettingChangeUseCase(repository, sender).execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      settingName: 'requests',
      enabled: false,
    })
    await new ShareRequestToTeamChatUseCase(repository, sender).execute({
      organizationId: 'org-1',
      actorId: 'user-1',
      requestId: 'req-1',
      requestNumber: 'R-1',
    })

    expect(messages.createSystemMessage).toHaveBeenNthCalledWith(1, {
      conversationId: 'team-chat-1',
      senderId: 'user-1',
      content: 'Ada disabled requests',
      metadata: { type: 'setting_change', setting: 'requests', enabled: false },
    })
    expect(messages.createSystemMessage).toHaveBeenNthCalledWith(2, {
      conversationId: 'team-chat-1',
      senderId: 'user-1',
      content: 'Ada shared a request',
      metadata: { type: 'request_shared', requestId: 'req-1', requestNumber: 'R-1' },
    })
  })
})
