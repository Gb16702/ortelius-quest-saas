import {
  GetConversationReadStatusesUseCase,
  MarkConversationAsReadUseCase,
  MarkMessageAsReadUseCase,
} from '../application/message-read-use-cases'
import { messageReadRepository } from './message-read.repository'
import { WebsocketMessageReadNotificationAdapter } from './message-read-notification.adapter'
import { SystemMessageReadClock } from './message-read-system.adapter'

let messageReadUseCases: {
  markMessageAsRead: MarkMessageAsReadUseCase
  markConversationAsRead: MarkConversationAsReadUseCase
  getConversationReadStatuses: GetConversationReadStatusesUseCase
} | null = null

export async function getMessageReadUseCases() {
  if (!messageReadUseCases) {
    const notifications = new WebsocketMessageReadNotificationAdapter()
    const clock = new SystemMessageReadClock()

    messageReadUseCases = {
      markMessageAsRead: new MarkMessageAsReadUseCase(messageReadRepository, notifications, clock),
      markConversationAsRead: new MarkConversationAsReadUseCase(
        messageReadRepository,
        notifications,
        clock
      ),
      getConversationReadStatuses: new GetConversationReadStatusesUseCase(messageReadRepository),
    }
  }

  return messageReadUseCases
}
