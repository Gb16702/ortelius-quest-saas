import {
  DeleteMessageUseCase,
  EditMessageUseCase,
  SendMessageUseCase,
  UploadMessageAttachmentsUseCase,
} from '../application/message-use-cases'
import {
  canAccessConversation,
  decryptMessageContent,
  messageRepository,
} from './message.repository'
import { DocumentMessageAttachmentAdapter } from './message-attachments.adapter'
import { WebsocketMessageBroadcastAdapter } from './message-broadcast.adapter'

let messageUseCases: {
  uploadAttachments: UploadMessageAttachmentsUseCase
  sendMessage: SendMessageUseCase
  deleteMessage: DeleteMessageUseCase
  editMessage: EditMessageUseCase
} | null = null

export async function getMessageUseCases() {
  if (!messageUseCases) {
    const broadcast = new WebsocketMessageBroadcastAdapter()

    messageUseCases = {
      uploadAttachments: new UploadMessageAttachmentsUseCase(
        { canAccessConversation },
        new DocumentMessageAttachmentAdapter()
      ),
      sendMessage: new SendMessageUseCase(messageRepository),
      deleteMessage: new DeleteMessageUseCase(messageRepository, broadcast),
      editMessage: new EditMessageUseCase(messageRepository, broadcast, decryptMessageContent),
    }
  }

  return messageUseCases
}
