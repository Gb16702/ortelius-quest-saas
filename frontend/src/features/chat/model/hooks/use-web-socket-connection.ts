import { useEffect, useRef } from "react"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import { fetchWsTicket } from "@/shared/api/websocket/ws-ticket.client"

export function useWebSocketConnection(userId?: string | null) {
    const { isConnected, connectionState, connectionError, connect, disconnect, sendMessage } =
        useWebSocket()

    const connectRef = useRef(connect)
    const disconnectRef = useRef(disconnect)
    const connectedUserIdRef = useRef<string | null>(null)

    useEffect(() => {
        connectRef.current = connect
        disconnectRef.current = disconnect
    }, [connect, disconnect])

    useEffect(() => {
        const nextUserId = userId ?? null

        if (!nextUserId) {
            if (connectedUserIdRef.current) {
                connectedUserIdRef.current = null
                disconnectRef.current()
            }
            return
        }

        if (connectedUserIdRef.current === nextUserId) {
            return
        }

        if (connectedUserIdRef.current) {
            disconnectRef.current()
        }

        connectedUserIdRef.current = nextUserId
        connectRef.current(nextUserId, fetchWsTicket)
    }, [userId])

    return {
        isConnected,
        connectionState,
        connectionError,
        sendMessage,
    }
}
