import type { SendMessageData } from '../../domain/messaging.types'
import type {
  MessageAccessPort,
  MessageAttachmentPort,
  MessageBroadcastPort,
  MessageRepositoryPort,
} from './ports'

export class UploadMessageAttachmentsUseCase {
  constructor(
    private readonly access: MessageAccessPort,
    private readonly attachments: MessageAttachmentPort
  ) {}

  async execute(command: { conversationId: string; userId: string; files: File[] }) {
    const allowed = await this.access.canAccessConversation(command.conversationId, command.userId)
    if (!allowed) {
      throw new Error('Forbidden')
    }

    return this.attachments.uploadAttachments(command)
  }
}

export class SendMessageUseCase {
  constructor(private readonly messages: MessageRepositoryPort) {}

  execute(command: SendMessageData) {
    return this.messages.sendMessage(command)
  }
}

export class DeleteMessageUseCase {
  constructor(
    private readonly messages: MessageRepositoryPort,
    private readonly broadcast: MessageBroadcastPort
  ) {}

  async execute(command: { messageId: string; userId: string }) {
    const deleted = await this.messages.deleteMessage(command.messageId, command.userId)
    await this.broadcast.broadcastDeleted({
      conversationId: deleted.conversationId,
      messageId: command.messageId,
      now: new Date(),
    })
  }
}

export class EditMessageUseCase {
  constructor(
    private readonly messages: MessageRepositoryPort,
    private readonly broadcast: MessageBroadcastPort,
    private readonly decrypt: (content: string) => string
  ) {}

  async execute(command: { messageId: string; userId: string; content: string }) {
    const message = await this.messages.editMessage(
      command.messageId,
      command.userId,
      command.content
    )
    const decryptedContent = this.decrypt(message.content)
    await this.broadcast.broadcastEdited({
      conversationId: message.conversationId,
      message,
      decryptedContent,
      now: new Date(),
    })

    return {
      ...message,
      content: decryptedContent,
    }
  }
}
