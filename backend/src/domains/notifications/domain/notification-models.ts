export interface NotificationPayload {
  type: 'message' | 'conversation_update' | 'request_update' | 'system'
  title?: string
  message: string
  data?: Record<string, unknown>
  timestamp: string
  userId: string
}

export interface MessageNotificationData {
  conversationId: string
  messageId: string
  senderId: string
  senderName: string
  senderImage?: string | null
  content: string
  conversationName?: string
  metadata?: Record<string, unknown>
}

export interface RequestNotificationData {
  requestId: string
  lifecycleStatus: string
  closedReason?: string | null
  details: string
  organizationName?: string
  requestNumber?: string
  assignedByName?: string
  assignedByImage?: string | null
  action?:
    | 'request_submitted'
    | 'request_received'
    | 'request_rejected'
    | 'request_canceled'
    | 'request_quoted'
    | 'request_completed'
    | 'request_assigned'
    | 'request_reassigned'
    | 'request_unassigned'
}

export interface SystemNotificationData {
  title: string
  message: string
  severity?: 'info' | 'warning' | 'error' | 'success'
  action?: { label: string; url: string }
}
