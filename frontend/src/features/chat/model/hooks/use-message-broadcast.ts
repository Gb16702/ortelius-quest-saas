import type { NewMessageMessage } from "@ortelius/websocket-types"
import { useEffect } from "react"

export function useMessageBroadcast() {
    const broadcastMessage = (message: NewMessageMessage) => {
        window.dispatchEvent(
            new CustomEvent<NewMessageMessage>("newMessage", {
                detail: message,
            })
        )
    }

    return { broadcastMessage }
}

export function useMessageListener(onMessage: (message: NewMessageMessage) => void) {
    useEffect(() => {
        const onNewMessage = (event: Event) => {
            onMessage((event as CustomEvent<NewMessageMessage>).detail)
        }

        window.addEventListener("newMessage", onNewMessage)

        return () => {
            window.removeEventListener("newMessage", onNewMessage)
        }
    }, [onMessage])
}
