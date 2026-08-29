import type { ReactNode } from "react"
import type { SessionResponse, User } from "@/entities/session"
import { UnreadConversationsProvider, useWebSocketConnection } from "@/features/chat"
import { NotificationProvider } from "@/features/notifications"
import { VoIPCallManager, type VoIPCurrentUser, VoIPProvider } from "@/features/voip"
import { WebSocketProvider } from "@/shared/api/websocket/web-socket.context"
import { PresenceManager } from "./presence-manager"

interface RootRuntimeShellProps {
    sessionData: SessionResponse | null
    user: User | null
    children: ReactNode
}

function RootRuntimeShellContent({ sessionData, user, children }: RootRuntimeShellProps) {
    const voipCurrentUser: VoIPCurrentUser = {
        userId: user?.id || sessionData?.user?.id || "",
        userName:
            user?.name ||
            sessionData?.user?.name ||
            user?.email ||
            sessionData?.user?.email ||
            "User",
        userImage: user?.image ?? sessionData?.user?.image ?? null,
    }

    useWebSocketConnection(voipCurrentUser.userId)

    return (
        <VoIPProvider currentUser={voipCurrentUser}>
            <NotificationProvider>
                <UnreadConversationsProvider>
                    <div className="h-dvh">{children}</div>
                    <VoIPCallManager />
                    <PresenceManager />
                </UnreadConversationsProvider>
            </NotificationProvider>
        </VoIPProvider>
    )
}

export function RootRuntimeShell(props: RootRuntimeShellProps) {
    return (
        <WebSocketProvider>
            <RootRuntimeShellContent {...props} />
        </WebSocketProvider>
    )
}
