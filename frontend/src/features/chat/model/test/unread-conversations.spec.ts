import { afterAll, describe, expect, it } from "bun:test"

const serverEnvDefaults = {
    NODE_ENV: "production",
    APP_ORIGIN: "https://app.example.test",
    AUTH_URL: "https://auth.example.test",
    API_URL: "https://api.example.test",
    LOGIN_URL: "https://login.example.test/auth",
    VITE_API_URL: "https://api.example.test",
    VITE_PORTAL_ACCOUNT_URL: "https://portal.example.test",
    VITE_WS_URL: "wss://ws.example.test",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(serverEnvDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(serverEnvDefaults)) {
    process.env[key] = value
}

const { shouldRefreshUnreadConversations } = await import("../unread-conversations.context")

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

describe("unread conversations refresh policy", () => {
    it("does not refresh without a current user", () => {
        expect(
            shouldRefreshUnreadConversations({
                currentUserId: undefined,
                fetchedUserId: null,
                lastFetchedAt: null,
                now: 1_000,
            })
        ).toBe(false)
    })

    it("refreshes when the user changes or has never been fetched", () => {
        expect(
            shouldRefreshUnreadConversations({
                currentUserId: "user-1",
                fetchedUserId: null,
                lastFetchedAt: null,
                now: 1_000,
            })
        ).toBe(true)

        expect(
            shouldRefreshUnreadConversations({
                currentUserId: "user-2",
                fetchedUserId: "user-1",
                lastFetchedAt: 900,
                now: 1_000,
            })
        ).toBe(true)
    })

    it("keeps reconnect and focus refreshes throttled for the same user", () => {
        expect(
            shouldRefreshUnreadConversations({
                currentUserId: "user-1",
                fetchedUserId: "user-1",
                lastFetchedAt: 900,
                now: 1_000,
                minimumIntervalMs: 200,
            })
        ).toBe(false)

        expect(
            shouldRefreshUnreadConversations({
                currentUserId: "user-1",
                fetchedUserId: "user-1",
                lastFetchedAt: 700,
                now: 1_000,
                minimumIntervalMs: 200,
            })
        ).toBe(true)
    })
})
