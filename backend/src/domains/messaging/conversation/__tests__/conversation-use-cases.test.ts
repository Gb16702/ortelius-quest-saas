import { describe, expect, it, mock } from 'bun:test'
import {
  GetConversationParticipantsUseCase,
  ListUserConversationsUseCase,
  PinConversationUseCase,
  ResolveMemberDmConversationUseCase,
} from '../application/conversation-use-cases'
import type {
  ConversationAccessPort,
  ConversationParticipantPresencePort,
  ConversationRepositoryPort,
} from '../application/ports'
import { ConversationAccessDeniedError } from '../domain'

function makeRepository(
  overrides: Partial<ConversationRepositoryPort> = {}
): ConversationRepositoryPort {
  return {
    getUserConversations: mock(async () => ({ conversations: [], total: 0 })),
    createTeamConversation: mock(async () => 'conv-team'),
    addMemberToTeamChat: mock(async () => {}),
    addMemberToAllOrganizationConversations: mock(async () => {}),
    pinConversation: mock(async () => {}),
    unpinConversation: mock(async () => {}),
    getUnreadConversationsCount: mock(async () => ({ count: 0, conversationIds: [] })),
    resolveMemberDmConversation: mock(async () => ({
      conversationId: 'conv-member-dm',
      conversationType: 'member_dm' as const,
    })),
    ...overrides,
  }
}

describe('Conversation use cases', () => {
  it('lists conversations through the repository port', async () => {
    const repository = makeRepository()
    const result = await new ListUserConversationsUseCase(repository).execute({
      userId: 'user-1',
      limit: 20,
      offset: 10,
      unreadOnly: true,
      searchQuery: 'ada',
      conversationType: 'team',
      sort: 'oldest',
    })

    expect(result).toEqual({ conversations: [], total: 0 })
    expect(repository.getUserConversations).toHaveBeenCalledWith(
      'user-1',
      20,
      10,
      true,
      'ada',
      'team',
      'oldest'
    )
  })

  it('pins conversations through the repository port', async () => {
    const repository = makeRepository()
    const result = await new PinConversationUseCase(repository).execute({
      conversationId: 'conv-1',
      userId: 'user-1',
    })

    expect(result).toEqual({ message: 'Conversation pinned successfully' })
    expect(repository.pinConversation).toHaveBeenCalledWith('conv-1', 'user-1')
  })

  it('resolves member DMs through the repository port', async () => {
    const repository = makeRepository()
    const result = await new ResolveMemberDmConversationUseCase(repository).execute({
      organizationId: 'org-1',
      currentUserId: 'user-1',
      targetUserId: 'user-2',
    })

    expect(result).toEqual({ conversationId: 'conv-member-dm', conversationType: 'member_dm' })
    expect(repository.resolveMemberDmConversation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      currentUserId: 'user-1',
      targetUserId: 'user-2',
    })
  })

  it('rejects member DMs to the current user before hitting the repository', async () => {
    const repository = makeRepository()

    expect(() =>
      new ResolveMemberDmConversationUseCase(repository).execute({
        organizationId: 'org-1',
        currentUserId: 'user-1',
        targetUserId: 'user-1',
      })
    ).toThrow('Cannot start a member DM with yourself')
    expect(repository.resolveMemberDmConversation).not.toHaveBeenCalled()
  })

  it('checks conversation access before returning participants', async () => {
    const access: ConversationAccessPort = {
      canAccessConversation: mock(async () => true),
    }
    const presence: ConversationParticipantPresencePort = {
      getConversationParticipants: mock(async () => [{ userId: 'user-1' }]),
    }

    const result = await new GetConversationParticipantsUseCase(access, presence).execute({
      conversationId: 'conv-1',
      userId: 'user-1',
    })

    expect(result).toEqual([{ userId: 'user-1' }])
    expect(access.canAccessConversation).toHaveBeenCalledWith('conv-1', 'user-1')
    expect(presence.getConversationParticipants).toHaveBeenCalledWith('conv-1')
  })

  it('rejects participant reads when access is denied', async () => {
    const access: ConversationAccessPort = {
      canAccessConversation: mock(async () => false),
    }
    const presence: ConversationParticipantPresencePort = {
      getConversationParticipants: mock(async () => []),
    }

    await expect(
      new GetConversationParticipantsUseCase(access, presence).execute({
        conversationId: 'conv-1',
        userId: 'user-1',
      })
    ).rejects.toThrow(ConversationAccessDeniedError)
    expect(presence.getConversationParticipants).not.toHaveBeenCalled()
  })
})
