import { useEffect, useRef } from "react"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"

export function usePresenceSubscription(userIds: string[]) {
    const { sendMessage, isConnected } = useWebSocket()
    const subscribedRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        if (!isConnected) return

        const desired = new Set(userIds)
        const current = subscribedRef.current

        const toAdd: string[] = []
        for (const id of desired) {
            if (!current.has(id)) toAdd.push(id)
        }
        if (toAdd.length > 0) {
            sendMessage({
                type: "presence:subscribe",
                userIds: toAdd,
                timestamp: new Date().toISOString(),
            })
            for (const id of toAdd) current.add(id)
        }

        const toRemove: string[] = []
        for (const id of current) {
            if (!desired.has(id)) toRemove.push(id)
        }
        if (toRemove.length > 0) {
            sendMessage({
                type: "presence:unsubscribe",
                userIds: toRemove,
                timestamp: new Date().toISOString(),
            })
            for (const id of toRemove) current.delete(id)
        }
    }, [isConnected, userIds, sendMessage])

    useEffect(() => {
        const subscribed = subscribedRef.current
        return () => {
            if (subscribed.size === 0) return
            sendMessage({
                type: "presence:unsubscribe",
                userIds: Array.from(subscribed),
                timestamp: new Date().toISOString(),
            })
            subscribed.clear()
        }
    }, [sendMessage])
}
