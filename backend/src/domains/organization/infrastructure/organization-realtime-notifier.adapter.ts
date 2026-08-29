import { sendToUsers } from '../../../infrastructure/messaging/websocket.service'
import type {
  OrganizationRealtimeNotifierPort,
  OrganizationRealtimeUpdatePayload,
} from '../application/ports'

export class WebSocketOrganizationRealtimeNotifier implements OrganizationRealtimeNotifierPort {
  async notifyOrganizationUpdated(
    userIds: string[],
    payload: OrganizationRealtimeUpdatePayload
  ): Promise<void> {
    sendToUsers(userIds, {
      type: 'organization:updated',
      organization: payload.organization,
      previousSlug: payload.previousSlug ?? null,
      timestamp: new Date().toISOString(),
    })
  }
}
