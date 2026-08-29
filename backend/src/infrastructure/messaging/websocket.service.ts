import type {
  CustomWebSocket,
  OutgoingMessage,
  PresenceBatchMessage,
  PresenceUpdateMessage,
  ServerPingMessage,
} from '@ortelius/websocket-types'
import { presenceService } from '../../domains/presence/infrastructure/presence.service'
import { RedisChannels, redisService } from '../cache/redis.service'

interface DistributedWebSocketMessage {
  targetUserId?: string
  messageData: OutgoingMessage
  broadcast?: boolean
  excludeUserId?: string
  sourceInstanceId: string
}

export type {
  ConnectionEstablishedMessage,
  ConversationParticipantsMessage,
  CustomWebSocket,
  ErrorMessage,
  IncomingMessage,
  MessageDeletedMessage,
  MessageEditedMessage,
  NewMessageMessage,
  NotificationMessage,
  OutgoingMessage,
  PongMessage,
  PresenceBatchMessage,
  PresenceUpdateMessage,
  ServerPingMessage,
  StatusUpdatedMessage,
  TypingMessage,
  VoIPAnswerMessage,
  VoIPCallEndMessage,
  VoIPCallRequestMessage,
  VoIPCallResponseMessage,
  VoIPIceCandidateMessage,
  VoIPOfferMessage,
  VoIPSpeakerUpdateMessage,
} from '@ortelius/websocket-types'

export const connectedUsers = new Map<string, Map<string, CustomWebSocket>>()
export const connectionToUser = new Map<string, string>()
export const activeConversations = new Map<string, string | null>()

// Presence subscriptions: subscriberUserId -> Set of userIds they want to track
const presenceSubscriptions = new Map<string, Set<string>>()
// Reverse lookup: targetUserId -> Set of subscriberUserIds subscribed to their presence
const presenceSubscribers = new Map<string, Set<string>>()

const instanceId = redisService.getInstanceId()

const HEARTBEAT_INTERVAL = 30000
const HEARTBEAT_TIMEOUT = 60000

interface ConnectionState {
  userId: string
  connectionId: string
  instanceId: string
  isAlive: boolean
  lastPong: number
  connectTime: number
  cleanupRegistered: boolean
  pingInterval: ReturnType<typeof setInterval> | null
}

// Hono's Bun adapter creates a fresh WSContext wrapper per event (open, message,
// close), so mutating properties on `ws` is unreliable. The underlying Bun
// ServerWebSocket exposed via `ws.raw` is stable per connection — keying our
// metadata WeakMap on it survives across events.
const connectionState = new WeakMap<object, ConnectionState>()

const rawKey = (ws: CustomWebSocket): object =>
  (ws as unknown as { raw?: object }).raw ?? (ws as unknown as object)

const getState = (ws: CustomWebSocket): ConnectionState | undefined =>
  connectionState.get(rawKey(ws))

const startConnectionHeartbeat = (ws: CustomWebSocket, state: ConnectionState) => {
  const interval = setInterval(() => {
    if (!state.isAlive) {
      console.warn(
        `Connection ${state.connectionId} for user ${state.userId} appears dead, terminating`
      )
      clearInterval(interval)
      state.pingInterval = null
      try {
        ws.close(1011, 'Connection appears dead')
      } catch (error) {
        console.error('Error closing dead connection:', error)
      }
      return
    }

    const timeSinceLastPong = Date.now() - (state.lastPong || state.connectTime || 0)
    if (timeSinceLastPong > HEARTBEAT_TIMEOUT) {
      console.warn(
        `Connection ${state.connectionId} for user ${state.userId} timed out (${timeSinceLastPong}ms since last pong)`
      )
      state.isAlive = false
      clearInterval(interval)
      state.pingInterval = null
      try {
        ws.close(1011, 'Heartbeat timeout')
      } catch (error) {
        console.error('Error closing timed out connection:', error)
      }
      return
    }

    state.isAlive = false
    try {
      const pingMessage: ServerPingMessage = {
        type: 'connection:ping',
        timestamp: new Date().toISOString(),
      }
      ws.send(JSON.stringify(pingMessage))
    } catch (error) {
      console.error(`Error sending ping to ${state.connectionId}:`, error)
      clearInterval(interval)
      state.pingInterval = null
      state.isAlive = false
    }
  }, HEARTBEAT_INTERVAL)
  state.pingInterval = interval
}

export const addUser = async (userId: string, ws: CustomWebSocket) => {
  try {
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Map())
    }

    const userConnections = connectedUsers.get(userId)!
    const connectionId = `ws_${userId}_${Date.now()}_${Math.random().toString(36).substring(2)}`

    const state: ConnectionState = {
      userId,
      connectionId,
      instanceId,
      isAlive: true,
      lastPong: Date.now(),
      connectTime: Date.now(),
      cleanupRegistered: false,
      pingInterval: null,
    }
    connectionState.set(rawKey(ws), state)

    userConnections.set(connectionId, ws)
    connectionToUser.set(connectionId, userId)

    startConnectionHeartbeat(ws, state)

    try {
      const client = redisService.getClient()
      await client.sadd(`user:${userId}:instances`, instanceId)
    } catch (redisError) {
      console.error(`Redis error adding user ${userId}:`, redisError)
    }

    // Set user as online in presence service
    try {
      await presenceService.setUserOnline(userId, instanceId)
    } catch (presenceError) {
      console.error(`Error setting user ${userId} online:`, presenceError)
    }

    console.log(`User ${userId} connected with connection ID ${connectionId}`)
  } catch (error) {
    console.error(`Error adding user ${userId}:`, error)
    throw error
  }
}

export const handlePong = (ws: CustomWebSocket) => {
  const state = getState(ws)
  if (!state) return
  state.isAlive = true
  state.lastPong = Date.now()

  if (state.userId) {
    presenceService.updateActivity(state.userId).catch((err) => {
      console.error(`Error updating activity for user ${state.userId}:`, err)
    })
  }
}

export const handleError = (ws: CustomWebSocket, error: Event | ErrorEvent) => {
  const state = getState(ws)
  console.error(`WebSocket error for user ${state?.userId} (${state?.connectionId}):`, error)
  if (state) state.isAlive = false
}

export const handleClose = async (ws: CustomWebSocket, event?: CloseEvent, userId?: string) => {
  const state = getState(ws)
  if (state?.cleanupRegistered) return
  if (state) state.cleanupRegistered = true

  const actualUserId = userId || state?.userId
  const connectionId = state?.connectionId

  console.log(`WebSocket closed for user ${actualUserId} (${connectionId}):`, {
    code: event?.code,
    reason: event?.reason,
    wasClean: event?.wasClean,
  })

  if (state) {
    state.isAlive = false
    if (state.pingInterval) {
      clearInterval(state.pingInterval)
      state.pingInterval = null
    }
  }

  if (actualUserId) {
    await removeUser(actualUserId, connectionId).catch((error) => {
      console.error(`Error during removeUser cleanup for ${actualUserId}:`, error)
    })
  }
}

export const removeUser = async (userId: string, connectionId?: string) => {
  if (!connectedUsers.has(userId)) return

  const userConnections = connectedUsers.get(userId)!

  if (connectionId) {
    userConnections.delete(connectionId)
    connectionToUser.delete(connectionId)

    if (userConnections.size === 0) {
      connectedUsers.delete(userId)

      const client = redisService.getClient()
      await client.srem(`user:${userId}:instances`, instanceId)

      // Set user offline - subscriptions will be cleaned up by the cleanup job
      // We don't clean subscriptions immediately to avoid race conditions with reconnections
      try {
        await presenceService.setUserOffline(userId)
      } catch (presenceError) {
        console.error(`Error setting user ${userId} offline:`, presenceError)
      }
    }
  } else {
    // Clean up all connections of this user
    Array.from(userConnections.keys()).forEach((connId) => {
      connectionToUser.delete(connId)
    })
    connectedUsers.delete(userId)

    const client = redisService.getClient()
    await client.srem(`user:${userId}:instances`, instanceId)

    // Set user offline - subscriptions will be cleaned up by the cleanup job
    try {
      await presenceService.setUserOffline(userId)
    } catch (presenceError) {
      console.error(`Error setting user ${userId} offline:`, presenceError)
    }
  }
}

export const getUser = (userId: string) => {
  const userConnections = connectedUsers.get(userId)
  return userConnections ? Array.from(userConnections.values())[0] : undefined
}

export const isUserOnline = (userId: string) => {
  const userConnections = connectedUsers.get(userId)
  if (!userConnections) return false

  return Array.from(userConnections.values()).some((ws) => ws.readyState === 1)
}

export const isUserOnlineGlobally = async (userId: string): Promise<boolean> => {
  if (isUserOnline(userId)) return true

  try {
    const client = redisService.getClient()
    const instances = await client.smembers(`user:${userId}:instances`)
    return instances.length > 0
  } catch (error) {
    console.error(`Error checking global connection for user ${userId}:`, error)
    return isUserOnline(userId)
  }
}

const sendToLocalUser = (userId: string, message: OutgoingMessage) => {
  const userConnections = connectedUsers.get(userId)
  let sent = false

  if (userConnections) {
    const messageStr = JSON.stringify(message)
    const connectionsToRemove: string[] = []

    userConnections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr)
          sent = true
        } catch (error) {
          console.error(`Error sending message to user ${userId} (${connectionId}):`, error)
          connectionsToRemove.push(connectionId)
        }
      } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        console.log(`Removing closed connection for user ${userId} (${connectionId})`)
        connectionsToRemove.push(connectionId)
      }
    })

    connectionsToRemove.forEach((connectionId) => {
      userConnections.delete(connectionId)
      connectionToUser.delete(connectionId)
    })

    if (userConnections.size === 0) {
      connectedUsers.delete(userId)
      console.log(`All connections removed for user ${userId}`)
    }
  }

  return sent
}

const publishDistributedUserMessage = async (userId: string, message: OutgoingMessage) => {
  await redisService.publish(
    RedisChannels.WS_MESSAGES,
    {
      targetUserId: userId,
      messageData: message,
    },
    true
  )
}

export const sendToUser = (userId: string, message: OutgoingMessage) => {
  const sent = sendToLocalUser(userId, message)

  try {
    void publishDistributedUserMessage(userId, message).catch((error: unknown) => {
      console.error(`Error publishing message to Redis for user ${userId}:`, error)
    })
  } catch (error) {
    console.error(`Error publishing message to Redis for user ${userId}:`, error)
  }

  return sent
}

export const sendToUserReliable = async (
  userId: string,
  message: OutgoingMessage
): Promise<boolean> => {
  const sent = sendToLocalUser(userId, message)
  await publishDistributedUserMessage(userId, message)
  return sent
}

export const sendToUsers = (userIds: string[], message: OutgoingMessage) => {
  const sentTo: string[] = []

  userIds.forEach((userId) => {
    if (sendToUser(userId, message)) {
      sentTo.push(userId)
    }
  })

  return sentTo
}

export const broadcastToAll = (message: OutgoingMessage, excludeUserId?: string) => {
  const sentTo: string[] = []
  const messageStr = JSON.stringify(message)

  connectedUsers.forEach((userConnections, userId) => {
    if (excludeUserId && userId === excludeUserId) return

    userConnections.forEach((ws, connectionId) => {
      if (ws.readyState === 1) {
        try {
          ws.send(messageStr)
          if (!sentTo.includes(userId)) {
            sentTo.push(userId)
          }
        } catch (_error) {
          userConnections.delete(connectionId)
          connectionToUser.delete(connectionId)
        }
      }
    })

    if (userConnections.size === 0) {
      connectedUsers.delete(userId)
    }
  })

  redisService.publish(
    RedisChannels.WS_MESSAGES,
    {
      broadcast: true,
      excludeUserId,
      messageData: message,
    },
    true
  )

  return sentTo
}

export const cleanupClosedConnections = () => {
  let cleanedCount = 0

  connectedUsers.forEach((userConnections, userId) => {
    const toRemove: string[] = []

    userConnections.forEach((ws, connectionId) => {
      if (ws.readyState === 3 || ws.readyState === 2) {
        toRemove.push(connectionId)
        cleanedCount++
      }
    })

    toRemove.forEach((connectionId) => {
      userConnections.delete(connectionId)
      connectionToUser.delete(connectionId)
    })

    if (userConnections.size === 0) {
      connectedUsers.delete(userId)
    }
  })

  return cleanedCount
}

export const getConnectionStats = () => {
  let totalConnections = 0
  let activeConnections = 0

  connectedUsers.forEach((userConnections) => {
    userConnections.forEach((ws) => {
      totalConnections++
      if (ws.readyState === 1) {
        activeConnections++
      }
    })
  })

  return {
    total: totalConnections,
    active: activeConnections,
    inactive: totalConnections - activeConnections,
    users: connectedUsers.size,
  }
}

export const pingAllUsers = () => {
  const pingMessage: ServerPingMessage = {
    type: 'connection:ping',
    timestamp: new Date().toISOString(),
  }
  return broadcastToAll(pingMessage)
}

let cleanupInterval: NodeJS.Timeout | null = null
let heartbeatInterval: NodeJS.Timeout | null = null

const handleDistributedMessage = (message: unknown) => {
  try {
    const { targetUserId, messageData, broadcast, excludeUserId, sourceInstanceId } =
      message as DistributedWebSocketMessage

    if (sourceInstanceId === instanceId) return

    if (broadcast) {
      broadcastToAll(messageData, excludeUserId)
    } else if (targetUserId && connectedUsers.has(targetUserId)) {
      sendToUser(targetUserId, messageData)
    }
  } catch (error) {
    console.error('Error handling distributed message:', error)
  }
}

export const startPeriodicCleanup = (intervalMs = 30000) => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }
  cleanupInterval = setInterval(() => {
    cleanupClosedConnections()
  }, intervalMs)
}

export const stopPeriodicCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

// ============================================================================
// Presence Subscription Management
// ============================================================================

export const handleSubscribePresence = async (
  subscriberUserId: string,
  targetUserIds: string[]
) => {
  if (!presenceSubscriptions.has(subscriberUserId)) {
    presenceSubscriptions.set(subscriberUserId, new Set())
  }

  const subscribed = presenceSubscriptions.get(subscriberUserId)!

  for (const targetUserId of targetUserIds) {
    subscribed.add(targetUserId)

    if (!presenceSubscribers.has(targetUserId)) {
      presenceSubscribers.set(targetUserId, new Set())
    }
    presenceSubscribers.get(targetUserId)!.add(subscriberUserId)
  }

  console.log(
    `[Presence] User ${subscriberUserId} subscribed to ${targetUserIds.length} users:`,
    targetUserIds
  )
  console.log(
    '[Presence] Current presenceSubscribers map:',
    Array.from(presenceSubscribers.entries()).map(([k, v]) => `${k}: [${Array.from(v).join(', ')}]`)
  )

  // Send current presence status for subscribed users
  const presenceMap = await presenceService.getBatchPresence(targetUserIds)
  const users = Array.from(presenceMap.values())

  const batchMessage: PresenceBatchMessage = {
    type: 'presence:batch',
    users,
    timestamp: new Date().toISOString(),
  }
  sendToUser(subscriberUserId, batchMessage)
}

export const handleUnsubscribePresence = (subscriberUserId: string, targetUserIds: string[]) => {
  console.log(
    `[Presence] User ${subscriberUserId} UNSUBSCRIBING from ${targetUserIds.length} users:`,
    targetUserIds
  )

  const subscribed = presenceSubscriptions.get(subscriberUserId)
  if (!subscribed) {
    console.log(`[Presence] No subscriptions found for user ${subscriberUserId}`)
    return
  }

  for (const targetUserId of targetUserIds) {
    subscribed.delete(targetUserId)

    const subscribers = presenceSubscribers.get(targetUserId)
    if (subscribers) {
      subscribers.delete(subscriberUserId)
      if (subscribers.size === 0) {
        presenceSubscribers.delete(targetUserId)
      }
    }
  }

  if (subscribed.size === 0) {
    presenceSubscriptions.delete(subscriberUserId)
  }

  console.log(
    '[Presence] After unsubscribe, presenceSubscribers map:',
    Array.from(presenceSubscribers.entries()).map(([k, v]) => `${k}: [${Array.from(v).join(', ')}]`)
  )
}

// Clean up all presence subscriptions for a user (when they disconnect)
export const cleanupUserPresenceSubscriptions = (userId: string) => {
  // Remove from subscribed targets
  const subscribedTargets = presenceSubscriptions.get(userId)
  if (subscribedTargets) {
    subscribedTargets.forEach((targetUserId) => {
      const subscribers = presenceSubscribers.get(targetUserId)
      if (subscribers) {
        subscribers.delete(userId)
        if (subscribers.size === 0) {
          presenceSubscribers.delete(targetUserId)
        }
      }
    })
    presenceSubscriptions.delete(userId)
  }
}

// Broadcast presence update to all subscribers of a specific user
const broadcastPresenceUpdate = (
  targetUserId: string,
  status: 'online' | 'offline',
  lastActiveAt: string
) => {
  const subscribers = presenceSubscribers.get(targetUserId)

  console.log(
    `[Presence] Broadcasting ${status} for user ${targetUserId} to ${subscribers?.size || 0} subscribers`
  )
  console.log(
    '[Presence] All presenceSubscribers:',
    Array.from(presenceSubscribers.entries()).map(([k, v]) => `${k}: [${Array.from(v).join(', ')}]`)
  )

  if (!subscribers || subscribers.size === 0) {
    console.log(`[Presence] No subscribers for user ${targetUserId}`)
    return
  }

  const message: PresenceUpdateMessage = {
    type: 'presence:update',
    userId: targetUserId,
    status,
    lastActiveAt,
    timestamp: new Date().toISOString(),
  }

  subscribers.forEach((subscriberUserId) => {
    console.log(`[Presence] Sending presence_update to ${subscriberUserId}`)
    sendToUser(subscriberUserId, message)
  })
}

// Handler for presence updates from Redis (cross-instance)
const handlePresenceUpdate = (event: {
  userId: string
  status: 'online' | 'offline'
  lastActiveAt: string
}) => {
  console.log(`[Presence] Received Redis presence update for user ${event.userId}: ${event.status}`)
  broadcastPresenceUpdate(event.userId, event.status, event.lastActiveAt)
}

export const initializeDistributedWebSocket = async () => {
  await redisService.subscribe(RedisChannels.WS_MESSAGES, handleDistributedMessage)

  // Subscribe to presence updates from Redis
  await presenceService.subscribeToPresenceUpdates(handlePresenceUpdate)

  // Start presence cleanup job (check every 60 seconds for inactive users)
  presenceService.startCleanupJob(60000)

  heartbeatInterval = redisService.startHeartbeatService()
  redisService.startCleanupService()
}

export const gracefulShutdown = async (shutdownTimeoutMs = 10000) => {
  // Stop presence cleanup job
  presenceService.stopCleanupJob()

  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }

  const shutdownMessage: OutgoingMessage = {
    type: 'connection:shutdown',
    timestamp: new Date().toISOString(),
  } as OutgoingMessage

  broadcastToAll(shutdownMessage)

  await new Promise((resolve) => setTimeout(resolve, 1000))

  const closePromises: Promise<void>[] = []

  connectedUsers.forEach((userConnections) => {
    userConnections.forEach((ws, connectionId) => {
      const state = getState(ws)
      if (state?.pingInterval) {
        clearInterval(state.pingInterval)
        state.pingInterval = null
      }

      const closePromise = new Promise<void>((resolve) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.onclose = () => resolve()
          ws.close(1001, 'Server shutdown')

          setTimeout(() => {
            try {
              if (ws.readyState !== WebSocket.CLOSED) {
                ws.close()
              }
            } catch (error) {
              console.error(`Error force closing connection ${connectionId}:`, error)
            }
            resolve()
          }, 5000)
        } else {
          resolve()
        }
      })

      closePromises.push(closePromise)
    })
  })

  try {
    await Promise.race([
      Promise.all(closePromises),
      new Promise((resolve) => setTimeout(resolve, shutdownTimeoutMs)),
    ])
  } catch (error) {
    console.error('Error during graceful shutdown:', error)
  }

  connectedUsers.clear()
  connectionToUser.clear()

  await redisService.cleanup()
}

export const cleanup = async () => {
  await gracefulShutdown(5000)
}
