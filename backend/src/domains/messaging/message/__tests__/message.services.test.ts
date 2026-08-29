import { beforeEach, describe, expect, test } from 'bun:test'
import type {
  AddReactionData,
  CreateSystemMessageData,
  Message,
  MessageReaction,
  MessageRepository,
  MessageWithSender,
  SendMessageData,
} from '../../domain/messaging.types'

class MockMessageService implements MessageRepository {
  private messages: Message[] = []
  private reactions: MessageReaction[] = []

  async sendMessage(data: SendMessageData): Promise<Message> {
    const message: Message = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      messageType: data.messageType || 'text',
      replyToId: data.replyToId || null,
      metadata: null,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.messages.push(message)
    return message
  }

  async getConversationMessages(
    conversationId: string,
    _userId: string,
    limit = 50,
    offset = 0
  ): Promise<MessageWithSender[]> {
    const conversationMessages = this.messages
      .filter((msg) => msg.conversationId === conversationId && !msg.isDeleted)
      .slice(offset, offset + limit)
      .map((msg) => ({
        ...msg,
        senderName: `User ${msg.senderId}`,
        senderImage: null,
      }))

    return conversationMessages
  }

  async addReaction(data: AddReactionData): Promise<MessageReaction> {
    const reaction: MessageReaction = {
      id: `reaction-${Math.random().toString(36).substr(2, 9)}`,
      messageId: data.messageId,
      userId: data.userId,
      emoji: data.emoji,
      createdAt: new Date(),
    }
    this.reactions.push(reaction)
    return reaction
  }

  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageReaction[]> {
    const removed = this.reactions.filter(
      (r) => r.messageId === messageId && r.userId === userId && r.emoji === emoji
    )
    this.reactions = this.reactions.filter(
      (r) => !(r.messageId === messageId && r.userId === userId && r.emoji === emoji)
    )
    return removed
  }

  async createSystemMessage(data: CreateSystemMessageData): Promise<Message> {
    const message: Message = {
      id: `sys-${Math.random().toString(36).substr(2, 9)}`,
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      messageType: 'system',
      replyToId: null,
      metadata: data.metadata || null,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.messages.push(message)
    return message
  }

  getMessages() {
    return this.messages
  }

  getReactions() {
    return this.reactions
  }

  reset() {
    this.messages = []
    this.reactions = []
  }
}

describe('MessageService', () => {
  let messageService: MockMessageService

  beforeEach(() => {
    messageService = new MockMessageService()
  })

  describe('sendMessage', () => {
    test('should send a text message successfully', async () => {
      const messageData: SendMessageData = {
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Hello world!',
        messageType: 'text',
      }

      const result = await messageService.sendMessage(messageData)

      expect(result.id).toBeDefined()
      expect(result.conversationId).toBe('conv-123')
      expect(result.senderId).toBe('user-123')
      expect(result.content).toBe('Hello world!')
      expect(result.messageType).toBe('text')
      expect(result.isEdited).toBe(false)
      expect(result.isDeleted).toBe(false)
    })

    test('should send a reply message successfully', async () => {
      const originalMessage = await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Original message',
      })

      const replyData: SendMessageData = {
        conversationId: 'conv-123',
        senderId: 'user-456',
        content: 'This is a reply',
        replyToId: originalMessage.id,
      }

      const result = await messageService.sendMessage(replyData)

      expect(result.replyToId).toBe(originalMessage.id)
      expect(result.content).toBe('This is a reply')
    })

    test('should default messageType to text when not provided', async () => {
      const messageData: SendMessageData = {
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Hello world!',
      }

      const result = await messageService.sendMessage(messageData)

      expect(result.messageType).toBe('text')
    })
  })

  describe('getConversationMessages', () => {
    test('should retrieve messages for a conversation', async () => {
      await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'First message',
      })

      await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-456',
        content: 'Second message',
      })

      await messageService.sendMessage({
        conversationId: 'conv-456',
        senderId: 'user-123',
        content: 'Different conversation',
      })

      const messages = await messageService.getConversationMessages('conv-123', 'user-123')

      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('First message')
      expect(messages[1].content).toBe('Second message')
      expect(messages[0].senderName).toBe('User user-123')
      expect(messages[1].senderName).toBe('User user-456')
    })

    test('should respect limit and offset parameters', async () => {
      for (let i = 1; i <= 5; i++) {
        await messageService.sendMessage({
          conversationId: 'conv-123',
          senderId: 'user-123',
          content: `Message ${i}`,
        })
      }

      const messages = await messageService.getConversationMessages('conv-123', 'user-123', 2, 1)

      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('Message 2')
      expect(messages[1].content).toBe('Message 3')
    })

    test('should exclude deleted messages', async () => {
      await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Active message',
      })

      const deletedMessage = await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Deleted message',
      })

      deletedMessage.isDeleted = true

      const messages = await messageService.getConversationMessages('conv-123', 'user-123')

      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Active message')
    })
  })

  describe('addReaction', () => {
    test('should add a reaction to a message', async () => {
      const message = await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Great message!',
      })

      const reactionData: AddReactionData = {
        messageId: message.id,
        userId: 'user-456',
        emoji: '👍',
      }

      const result = await messageService.addReaction(reactionData)

      expect(result.id).toBeDefined()
      expect(result.messageId).toBe(message.id)
      expect(result.userId).toBe('user-456')
      expect(result.emoji).toBe('👍')
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    test('should allow multiple reactions on the same message', async () => {
      const message = await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Great message!',
      })

      await messageService.addReaction({
        messageId: message.id,
        userId: 'user-456',
        emoji: '👍',
      })

      await messageService.addReaction({
        messageId: message.id,
        userId: 'user-789',
        emoji: '❤️',
      })

      const reactions = messageService.getReactions()
      expect(reactions).toHaveLength(2)
    })
  })

  describe('removeReaction', () => {
    test('should remove a reaction from a message', async () => {
      const message = await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Great message!',
      })

      await messageService.addReaction({
        messageId: message.id,
        userId: 'user-456',
        emoji: '👍',
      })

      const removed = await messageService.removeReaction(message.id, 'user-456', '👍')

      expect(removed).toHaveLength(1)
      expect(removed[0].emoji).toBe('👍')
      expect(messageService.getReactions()).toHaveLength(0)
    })

    test('should only remove specific user reaction', async () => {
      const message = await messageService.sendMessage({
        conversationId: 'conv-123',
        senderId: 'user-123',
        content: 'Great message!',
      })

      await messageService.addReaction({
        messageId: message.id,
        userId: 'user-456',
        emoji: '👍',
      })

      await messageService.addReaction({
        messageId: message.id,
        userId: 'user-789',
        emoji: '👍',
      })

      await messageService.removeReaction(message.id, 'user-456', '👍')

      const reactions = messageService.getReactions()
      expect(reactions).toHaveLength(1)
      expect(reactions[0].userId).toBe('user-789')
    })
  })

  describe('createSystemMessage', () => {
    test('should create a system message successfully', async () => {
      const systemData: CreateSystemMessageData = {
        conversationId: 'conv-123',
        senderId: 'system',
        content: 'User joined the conversation',
        metadata: { action: 'user_joined', userId: 'user-456' },
      }

      const result = await messageService.createSystemMessage(systemData)

      expect(result.id).toBeDefined()
      expect(result.conversationId).toBe('conv-123')
      expect(result.senderId).toBe('system')
      expect(result.content).toBe('User joined the conversation')
      expect(result.messageType).toBe('system')
      expect(result.metadata).toEqual({ action: 'user_joined', userId: 'user-456' })
    })

    test('should create system message without metadata', async () => {
      const systemData: CreateSystemMessageData = {
        conversationId: 'conv-123',
        senderId: 'system',
        content: 'System notification',
      }

      const result = await messageService.createSystemMessage(systemData)

      expect(result.messageType).toBe('system')
      expect(result.metadata).toBeNull()
    })
  })
})
