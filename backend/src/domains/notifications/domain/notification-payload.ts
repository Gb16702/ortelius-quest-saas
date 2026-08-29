import type {
  MessageNotificationData,
  NotificationPayload,
  RequestNotificationData,
  SystemNotificationData,
} from './notification-models'

export function getRequestNotificationTitle(data: RequestNotificationData): string {
  switch (data.action || data.lifecycleStatus) {
    case 'request_received':
    case 'open':
      return 'New Request'
    case 'invoiced':
      return 'Invoice Ready'
    case 'request_assigned':
      return 'Request Assigned to You'
    case 'request_reassigned':
      return 'Request Reassigned to You'
    case 'request_unassigned':
      return 'Request Unassigned'
    default:
      return 'Request Status Change'
  }
}

export function buildMessageNotificationPayload(
  userId: string,
  data: MessageNotificationData,
  now = new Date()
): NotificationPayload {
  return {
    type: 'message',
    title: data.senderName,
    message: data.content,
    data: {
      conversationId: data.conversationId,
      messageId: data.messageId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderImage: data.senderImage,
      conversationName: data.conversationName,
      metadata: data.metadata,
    },
    timestamp: now.toISOString(),
    userId,
  }
}

export function buildRequestUpdateNotificationPayload(
  userId: string,
  data: RequestNotificationData,
  now = new Date()
): NotificationPayload {
  return {
    type: 'request_update',
    title: getRequestNotificationTitle(data),
    message: data.details,
    data: {
      requestId: data.requestId,
      lifecycleStatus: data.lifecycleStatus,
      closedReason: data.closedReason,
      organizationName: data.organizationName,
      requestNumber: data.requestNumber,
      assignedByName: data.assignedByName,
      assignedByImage: data.assignedByImage,
    },
    timestamp: now.toISOString(),
    userId,
  }
}

export function buildSystemNotificationPayload(
  userId: string,
  data: SystemNotificationData,
  now = new Date()
): NotificationPayload {
  return {
    type: 'system',
    title: data.title,
    message: data.message,
    data: {
      severity: data.severity || 'info',
      action: data.action,
    },
    timestamp: now.toISOString(),
    userId,
  }
}
