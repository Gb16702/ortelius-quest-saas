export interface TeamChatNotification {
  organizationId: string
  actorId: string
  content: string
  metadata?: Record<string, unknown>
}

export function buildSettingChangeNotification(input: {
  organizationId: string
  actorId: string
  actorName: string
  settingName: string
  enabled: boolean
}): TeamChatNotification {
  const action = input.enabled ? 'enabled' : 'disabled'
  return {
    organizationId: input.organizationId,
    actorId: input.actorId,
    content: `${input.actorName} ${action} ${input.settingName}`,
    metadata: {
      type: 'setting_change',
      setting: input.settingName,
      enabled: input.enabled,
    },
  }
}

export function buildMemberJoinedNotification(input: {
  organizationId: string
  userId: string
  userName: string
}): TeamChatNotification {
  return {
    organizationId: input.organizationId,
    actorId: input.userId,
    content: `${input.userName} joined the team`,
    metadata: {
      type: 'member_joined',
      userId: input.userId,
      userName: input.userName,
    },
  }
}

export function buildMemberLeftNotification(input: {
  organizationId: string
  userId: string
  userName: string
}): TeamChatNotification {
  return {
    organizationId: input.organizationId,
    actorId: input.userId,
    content: `${input.userName} left the organization`,
    metadata: {
      type: 'member_left',
      userId: input.userId,
      userName: input.userName,
    },
  }
}

export function buildRequestSharedNotification(input: {
  organizationId: string
  actorId: string
  actorName: string
  requestId: string
  requestNumber: string
}): TeamChatNotification {
  return {
    organizationId: input.organizationId,
    actorId: input.actorId,
    content: `${input.actorName} shared a request`,
    metadata: {
      type: 'request_shared',
      requestId: input.requestId,
      requestNumber: input.requestNumber,
    },
  }
}
