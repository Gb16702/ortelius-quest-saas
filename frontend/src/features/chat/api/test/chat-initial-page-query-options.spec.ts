import { afterEach, describe, expect, it } from "bun:test"
import { QueryClient } from "@tanstack/react-query"
import type { ApiError } from "@/shared/api/http.response"
import {
    CONVERSATIONS_PAGE_LIMIT,
    chatMessagesPageQueryOptions,
    fetchChatMessagesPage,
    fetchInitialChatPageData,
    initialConversationsPageQueryOptions,
    MESSAGE_PAGE_LIMIT,
} from "../chat.api"
import { chatKeys } from "../chat.query-keys"

const originalFetch = globalThis.fetch
let fetchCalls: Array<{
    input: Parameters<typeof fetch>[0]
    init: Parameters<typeof fetch>[1] | undefined
}> = []

function installFetch() {
    const mockedFetch = Object.assign(
        (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
            fetchCalls.push({ input, init })
            const url = String(input)

            if (url.includes("/messages?")) {
                return Promise.resolve(Response.json(buildMessagesPayload()))
            }

            return Promise.resolve(Response.json(buildConversationsPayload()))
        },
        { preconnect: originalFetch.preconnect }
    ) satisfies typeof fetch

    globalThis.fetch = mockedFetch
}

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
}

function buildMessagesPayload() {
    return {
        data: {
            messages: [
                {
                    id: "message-1",
                    content: "Hydrated hello",
                    messageType: "text",
                    senderId: "user-2",
                    senderName: "Grace Hopper",
                    senderImage: null,
                    organizationName: null,
                    memberRole: null,
                    metadata: null,
                    replyTo: null,
                    isEdited: false,
                    isDeleted: false,
                    createdAt: "2026-05-13T12:00:00.000Z",
                    updatedAt: "2026-05-13T12:00:00.000Z",
                },
            ],
            pagination: {
                total: 1,
                limit: MESSAGE_PAGE_LIMIT,
                offset: 0,
                hasMore: false,
            },
        },
    }
}

function buildConversationsPayload() {
    return {
        success: true,
        data: {
            conversations: [
                {
                    id: "conversation-1",
                    name: "Ops",
                    lastMessage: null,
                    updatedAt: "2026-05-13T12:00:00.000Z",
                    conversationType: "team",
                    isTeamChat: true,
                    organizationId: "org-1",
                },
            ],
            pagination: {
                total: 1,
                limit: CONVERSATIONS_PAGE_LIMIT,
                offset: 0,
                hasMore: false,
            },
        },
    }
}

afterEach(() => {
    globalThis.fetch = originalFetch
    fetchCalls = []
})

describe("chat initial page query options", () => {
    it("scopes the active conversation first messages page and keeps fresh cache data", async () => {
        installFetch()
        const queryClient = createQueryClient()
        const options = chatMessagesPageQueryOptions({
            userId: "user-1",
            scope: "/org/acme",
            conversationId: "conversation-1",
        })

        await queryClient.fetchQuery(options)
        await queryClient.fetchQuery(options)

        expect([...options.queryKey]).toEqual([
            ...chatKeys.messagesPage({
                userId: "user-1",
                scope: "/org/acme",
                conversationId: "conversation-1",
                limit: MESSAGE_PAGE_LIMIT,
                offset: 0,
            }),
        ])
        expect(fetchCalls).toHaveLength(1)
        expect(fetchCalls[0]?.input).toBe(
            `/api/conversations/conversation-1/messages?limit=${MESSAGE_PAGE_LIMIT}&offset=0`
        )
    })

    it("scopes the default first conversations page without fetching filtered pages", async () => {
        installFetch()
        const queryClient = createQueryClient()
        const options = initialConversationsPageQueryOptions({
            userId: "user-1",
            scope: "/org/acme",
        })

        await queryClient.fetchQuery(options)

        expect([...options.queryKey]).toEqual([
            ...chatKeys.initialConversationsPage({
                userId: "user-1",
                scope: "/org/acme",
                limit: CONVERSATIONS_PAGE_LIMIT,
                offset: 0,
            }),
        ])
        expect(fetchCalls).toHaveLength(1)
        expect(fetchCalls[0]?.input).toBe(
            `/api/conversations?limit=${CONVERSATIONS_PAGE_LIMIT}&offset=0`
        )
    })

    it("reuses fresh first-page query data for initial chat hydration", async () => {
        installFetch()
        const queryClient = createQueryClient()

        await fetchInitialChatPageData({
            queryClient,
            userId: "user-1",
            scope: "/org/acme",
            conversationId: "conversation-1",
        })
        const result = await fetchInitialChatPageData({
            queryClient,
            userId: "user-1",
            scope: "/org/acme",
            conversationId: "conversation-1",
        })

        expect(fetchCalls.map((call) => call.input)).toEqual([
            `/api/conversations/conversation-1/messages?limit=${MESSAGE_PAGE_LIMIT}&offset=0`,
            `/api/conversations?limit=${CONVERSATIONS_PAGE_LIMIT}&offset=0`,
        ])
        expect(result.messages).toHaveLength(1)
        expect(result.conversations).toHaveLength(1)
    })

    it("preserves the HTTP status for message page authorization failures", async () => {
        const mockedFetch = Object.assign(
            (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
                fetchCalls.push({ input, init })
                return Promise.resolve(
                    Response.json(
                        {
                            success: false,
                            code: "FORBIDDEN",
                            message: "Access denied",
                        },
                        { status: 403 }
                    )
                )
            },
            { preconnect: originalFetch.preconnect }
        ) satisfies typeof fetch

        globalThis.fetch = mockedFetch

        await expect(
            fetchChatMessagesPage({ conversationId: "conversation-1", offset: 0 })
        ).rejects.toMatchObject({
            name: "ApiError",
            status: 403,
            message: "Access denied",
        } satisfies Partial<ApiError>)

        expect(fetchCalls).toHaveLength(1)
        expect(fetchCalls[0]?.input).toBe(
            `/api/conversations/conversation-1/messages?limit=${MESSAGE_PAGE_LIMIT}&offset=0`
        )
    })
})
