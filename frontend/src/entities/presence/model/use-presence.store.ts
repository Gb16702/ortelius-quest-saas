import { create } from "zustand"

export type PresenceStatus = "online" | "offline"

export interface UserPresence {
    userId: string
    status: PresenceStatus
    lastActiveAt: string
}

interface PresenceState {
    presenceMap: Map<string, UserPresence>
    setPresence: (userId: string, presence: UserPresence) => void
    setBatchPresence: (presences: UserPresence[]) => void
    getPresence: (userId: string) => UserPresence | undefined
    isOnline: (userId: string) => boolean
    clear: () => void
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
    presenceMap: new Map(),

    setPresence: (userId, presence) => {
        set((state) => {
            const newMap = new Map(state.presenceMap)
            newMap.set(userId, presence)
            return { presenceMap: newMap }
        })
    },

    setBatchPresence: (presences) => {
        set((state) => {
            const newMap = new Map(state.presenceMap)
            for (const presence of presences) {
                newMap.set(presence.userId, presence)
            }
            return { presenceMap: newMap }
        })
    },

    getPresence: (userId) => {
        return get().presenceMap.get(userId)
    },

    isOnline: (userId) => {
        const presence = get().presenceMap.get(userId)
        return presence?.status === "online"
    },

    clear: () => {
        set({ presenceMap: new Map() })
    },
}))
