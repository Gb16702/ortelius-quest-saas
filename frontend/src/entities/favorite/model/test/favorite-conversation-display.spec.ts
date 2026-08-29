import { describe, expect, it } from "bun:test"
import type { FavoriteItem } from "../favorite.schema"
import {
    mergeFavoriteConversationDisplayMetadata,
    readFavoriteConversationDisplayMetadata,
    rememberFavoriteConversationDisplay,
} from "../favorite-conversation-display"

class MemoryStorage {
    private readonly values = new Map<string, string>()

    getItem(key: string): string | null {
        return this.values.get(key) ?? null
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value)
    }
}

const favorite: FavoriteItem = {
    id: "favorite-1",
    entityType: "conversation",
    entityId: "conversation-1",
    organizationId: "org-1",
    label: "Direct message with Geoffrey Delhaye",
    createdAt: "2026-05-28T10:00:00.000Z",
}

describe("favorite conversation display metadata", () => {
    it("persists and reads conversation display metadata by organization and conversation", () => {
        const storage = new MemoryStorage()

        rememberFavoriteConversationDisplay({
            organizationId: "org-1",
            conversationId: "conversation-1",
            conversationType: "requester",
            isTeamChat: false,
            name: "Geoffrey Delhaye",
            storage,
        })

        expect(
            readFavoriteConversationDisplayMetadata({
                organizationId: "org-1",
                conversationId: "conversation-1",
                storage,
            })
        ).toMatchObject({
            conversationType: "requester",
            isTeamChat: false,
            name: "Geoffrey Delhaye",
        })
    })

    it("merges persisted metadata into a server favorite after refresh", () => {
        const storage = new MemoryStorage()
        rememberFavoriteConversationDisplay({
            organizationId: "org-1",
            conversationId: "conversation-1",
            conversationType: "requester",
            isTeamChat: false,
            name: "Geoffrey Delhaye",
            storage,
        })

        const previousStorage = globalThis.localStorage
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            value: storage,
        })

        try {
            expect(mergeFavoriteConversationDisplayMetadata(favorite)).toMatchObject({
                label: "Geoffrey Delhaye",
                meta: {
                    conversationType: "requester",
                    requesterName: "Geoffrey Delhaye",
                },
            })
        } finally {
            Object.defineProperty(globalThis, "localStorage", {
                configurable: true,
                value: previousStorage,
            })
        }
    })
})
