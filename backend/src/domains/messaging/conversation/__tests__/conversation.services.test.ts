import { beforeEach, describe, expect, test } from 'bun:test'
import type { ConversationRepository, ConversationWithDetails } from '../../domain/messaging.types'

class MockConversationService implements ConversationRepository {
  private conversations: ConversationWithDetails[] = []

  async getUserConversations(userId: string): Promise<ConversationWithDetails[]> {
    return this.conversations.filter(
      (conv) =>
        conv.createdBy === userId ||
        conv.requesterId === userId ||
        this.isUserParticipant(conv.id, userId)
    )
  }

  private isUserParticipant(_conversationId: string, _userId: string): boolean {
    return true
  }

  addMockConversation(conversation: ConversationWithDetails) {
    this.conversations.push(conversation)
  }

  reset() {
    this.conversations = []
  }

  getConversations() {
    return this.conversations
  }
}

describe('ConversationService', () => {
  let conversationService: MockConversationService

  beforeEach(() => {
    conversationService = new MockConversationService()
  })

  describe('getUserConversations', () => {
    test('should return conversations where user is creator', async () => {
      const mockConversation: ConversationWithDetails = {
        id: 'conv-123',
        name: 'Test Conversation',
        description: 'A test conversation',
        createdBy: 'user-123',
        requesterId: null,
        organizationId: 'org-123',
        anonymousRequesterId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        lastMessage: {
          id: 'msg-456',
          conversationId: 'conv-123',
          senderId: 'user-456',
          content: 'Hello world!',
          messageType: 'text',
          replyToId: null,
          metadata: null,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
          senderName: 'John Doe',
          senderImage: null,
          isUnread: true,
        },
        contextInfo: {
          type: 'user',
          id: 'user-456',
          name: 'John Doe',
          image: null,
        },
        joinedAt: new Date('2023-01-01'),
        leftAt: null,
        role: 'admin',
      }

      conversationService.addMockConversation(mockConversation)

      const result = await conversationService.getUserConversations('user-123')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('conv-123')
      expect(result[0].name).toBe('Test Conversation')
      expect(result[0].createdBy).toBe('user-123')
    })

    test('should return conversations where user is requester', async () => {
      const mockConversation: ConversationWithDetails = {
        id: 'conv-456',
        name: 'Request Conversation',
        description: 'A conversation from a request',
        createdBy: 'org-admin-123',
        requesterId: 'user-456',
        organizationId: 'org-123',
        anonymousRequesterId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        lastMessage: null,
        contextInfo: {
          type: 'organization',
          id: 'org-123',
          name: 'Test Organization',
          logo: 'https://example.com/logo.png',
        },
        joinedAt: new Date('2023-01-01'),
        leftAt: null,
        role: 'requester',
      }

      conversationService.addMockConversation(mockConversation)

      const result = await conversationService.getUserConversations('user-456')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('conv-456')
      expect(result[0].requesterId).toBe('user-456')
      expect(result[0].contextInfo?.type).toBe('organization')
      expect(result[0].contextInfo?.name).toBe('Test Organization')
    })

    test('should return empty array when user has no conversations', async () => {
      const result = await conversationService.getUserConversations('user-nonexistent')

      expect(result).toHaveLength(0)
    })

    test('should include conversation with unread last message', async () => {
      const mockConversation: ConversationWithDetails = {
        id: 'conv-789',
        name: 'Unread Messages',
        description: null,
        createdBy: 'user-123',
        requesterId: null,
        organizationId: 'org-123',
        anonymousRequesterId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-03'),
        lastMessage: {
          id: 'msg-789',
          conversationId: 'conv-789',
          senderId: 'user-456',
          content: 'Unread message content',
          messageType: 'text',
          replyToId: null,
          metadata: null,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-03'),
          senderName: 'Jane Smith',
          senderImage: 'https://example.com/avatar.jpg',
          isUnread: true,
        },
        contextInfo: null,
        joinedAt: new Date('2023-01-01'),
        leftAt: null,
        role: 'participant',
      }

      conversationService.addMockConversation(mockConversation)

      const result = await conversationService.getUserConversations('user-123')

      expect(result).toHaveLength(1)
      expect(result[0].lastMessage?.isUnread).toBe(true)
      expect(result[0].lastMessage?.content).toBe('Unread message content')
      expect(result[0].lastMessage?.senderName).toBe('Jane Smith')
    })

    test('should include conversation with read last message', async () => {
      const mockConversation: ConversationWithDetails = {
        id: 'conv-read',
        name: 'Read Messages',
        description: null,
        createdBy: 'user-123',
        requesterId: null,
        organizationId: 'org-123',
        anonymousRequesterId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-03'),
        lastMessage: {
          id: 'msg-read',
          conversationId: 'conv-read',
          senderId: 'user-456',
          content: 'Read message content',
          messageType: 'text',
          replyToId: null,
          metadata: null,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-03'),
          senderName: 'Jane Smith',
          senderImage: null,
          isUnread: false,
        },
        contextInfo: null,
        joinedAt: new Date('2023-01-01'),
        leftAt: null,
        role: 'participant',
      }

      conversationService.addMockConversation(mockConversation)

      const result = await conversationService.getUserConversations('user-123')

      expect(result).toHaveLength(1)
      expect(result[0].lastMessage?.isUnread).toBe(false)
    })

    test('should handle conversation with system message', async () => {
      const mockConversation: ConversationWithDetails = {
        id: 'conv-system',
        name: 'System Messages',
        description: null,
        createdBy: 'user-123',
        requesterId: 'user-456',
        organizationId: 'org-123',
        anonymousRequesterId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-03'),
        lastMessage: {
          id: 'msg-system',
          conversationId: 'conv-system',
          senderId: 'system',
          content: 'User has joined the conversation',
          messageType: 'system',
          replyToId: null,
          metadata: { action: 'user_joined', userId: 'user-456' },
          isEdited: false,
          isDeleted: false,
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-03'),
          senderName: 'System',
          senderImage: null,
          isUnread: false,
        },
        contextInfo: {
          type: 'user',
          id: 'user-456',
          name: 'Jane Smith',
          image: null,
        },
        joinedAt: new Date('2023-01-01'),
        leftAt: null,
        role: 'participant',
      }

      conversationService.addMockConversation(mockConversation)

      const result = await conversationService.getUserConversations('user-123')

      expect(result).toHaveLength(1)
      expect(result[0].lastMessage?.messageType).toBe('system')
      expect(result[0].lastMessage?.content).toBe('User has joined the conversation')
      expect(result[0].lastMessage?.metadata).toEqual({ action: 'user_joined', userId: 'user-456' })
    })

    test('should handle conversation with anonymous requester', async () => {
      const mockConversation: ConversationWithDetails = {
        id: 'conv-anon',
        name: 'Anonymous Request',
        description: null,
        createdBy: 'org-admin-123',
        requesterId: null,
        organizationId: 'org-123',
        anonymousRequesterId: 'anon-123',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        lastMessage: {
          id: 'msg-anon',
          conversationId: 'conv-anon',
          senderId: 'org-admin-123',
          content: 'Response to anonymous request',
          messageType: 'text',
          replyToId: null,
          metadata: null,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
          senderName: 'Organization Admin',
          senderImage: null,
          isUnread: false,
        },
        contextInfo: null,
        joinedAt: new Date('2023-01-01'),
        leftAt: null,
        role: 'admin',
      }

      conversationService.addMockConversation(mockConversation)

      const result = await conversationService.getUserConversations('org-admin-123')

      expect(result).toHaveLength(1)
      expect(result[0].anonymousRequesterId).toBe('anon-123')
      expect(result[0].requesterId).toBeNull()
    })

    test('should return multiple conversations sorted by updated date', async () => {
      const olderConversation: ConversationWithDetails = {
        id: 'conv-old',
        name: 'Older Conversation',
        description: null,
        createdBy: 'user-123',
        requesterId: null,
        organizationId: 'org-123',
        anonymousRequesterId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        lastMessage: null,
        contextInfo: null,
        joinedAt: new Date('2023-01-01'),
        leftAt: null,
        role: 'admin',
      }

      const newerConversation: ConversationWithDetails = {
        id: 'conv-new',
        name: 'Newer Conversation',
        description: null,
        createdBy: 'user-123',
        requesterId: null,
        organizationId: 'org-123',
        anonymousRequesterId: null,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-05'),
        lastMessage: null,
        contextInfo: null,
        joinedAt: new Date('2023-01-02'),
        leftAt: null,
        role: 'admin',
      }

      conversationService.addMockConversation(olderConversation)
      conversationService.addMockConversation(newerConversation)

      const result = await conversationService.getUserConversations('user-123')

      expect(result).toHaveLength(2)
    })
  })
})
