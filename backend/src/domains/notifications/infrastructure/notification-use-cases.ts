import type { NotificationSubscriptionManager } from '../application/notification-models'
import {
  ArchiveNotificationUseCase,
  CreateNotificationUseCase,
  GetUnreadNotificationCountUseCase,
  ListUserNotificationsUseCase,
  MarkNotificationReadStateUseCase,
  SendNotificationUseCase,
} from '../application/notification-use-cases'
import { NotificationInfrastructureAdapter } from './notification.adapter'

export interface NotificationUseCaseContainer {
  create: CreateNotificationUseCase
  listUserNotifications: ListUserNotificationsUseCase
  getUnreadCount: GetUnreadNotificationCountUseCase
  readState: MarkNotificationReadStateUseCase
  archive: ArchiveNotificationUseCase
  send: SendNotificationUseCase
}

let notificationAdapter: NotificationInfrastructureAdapter | null = null
let notificationUseCases: NotificationUseCaseContainer | null = null

function getNotificationAdapter(): NotificationInfrastructureAdapter {
  if (notificationAdapter) return notificationAdapter
  notificationAdapter = new NotificationInfrastructureAdapter()
  return notificationAdapter
}

export function getNotificationSubscriptions(): NotificationSubscriptionManager {
  return getNotificationAdapter().subscriptions
}

export function getNotificationUseCases(): NotificationUseCaseContainer {
  if (notificationUseCases) return notificationUseCases

  const notifications = getNotificationAdapter()
  notificationUseCases = {
    create: new CreateNotificationUseCase(notifications),
    listUserNotifications: new ListUserNotificationsUseCase(notifications),
    getUnreadCount: new GetUnreadNotificationCountUseCase(notifications),
    readState: new MarkNotificationReadStateUseCase(notifications),
    archive: new ArchiveNotificationUseCase(notifications),
    send: new SendNotificationUseCase(notifications),
  }

  return notificationUseCases
}
