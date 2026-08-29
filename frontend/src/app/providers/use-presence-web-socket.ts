import {
    PresenceBatchMessageSchema,
    PresenceUpdateMessageSchema,
} from "@ortelius/websocket-types/messages"
import { useEffect } from "react"
import { usePresenceStore } from "@/entities/presence"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import { logError } from "@/shared/lib/error"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

export function usePresenceWebSocket() {
    const { subscribe } = useWebSocket()
    const setPresence = usePresenceStore((state) => state.setPresence)
    const setBatchPresence = usePresenceStore((state) => state.setBatchPresence)

    useEffect(() => {
        const unsubscribe = subscribe((message) => {
            if (message.type === "presence:update") {
                const result = safeParseSchema(PresenceUpdateMessageSchema, message)
                if (!result.success) {
                    logError("Invalid presence:update WebSocket payload", result.error)
                    return
                }
                const { userId, status, lastActiveAt } = result.data
                setPresence(userId, { userId, status, lastActiveAt })
            } else if (message.type === "presence:batch") {
                const result = safeParseSchema(PresenceBatchMessageSchema, message)
                if (!result.success) {
                    logError("Invalid presence:batch WebSocket payload", result.error)
                    return
                }
                const { users } = result.data
                setBatchPresence(users)
            }
        })

        return () => {
            unsubscribe()
        }
    }, [subscribe, setPresence, setBatchPresence])
}
