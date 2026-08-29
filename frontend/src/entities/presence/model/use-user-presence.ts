import { useMemo } from "react"
import { type UserPresence, usePresenceStore } from "./use-presence.store"
import { usePresenceSubscription } from "./use-presence-subscription"

export function useUserPresence(userId: string | undefined): UserPresence | undefined {
    const presence = usePresenceStore((state) =>
        userId ? state.presenceMap.get(userId) : undefined
    )

    const userIds = useMemo(() => (userId ? [userId] : []), [userId])
    usePresenceSubscription(userIds)

    return presence
}
