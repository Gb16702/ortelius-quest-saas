import { QueryClient } from "@tanstack/react-query"
import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    chatConversationsResponseSchema,
    chatMessagesPageResponseSchema,
} from "../model/schemas/chats.schema"
import {
    chatMessagesPageQueryOptions,
    type InitialChatPageData,
    initialConversationsPageQueryOptions,
} from "./chat.api"
import { CONVERSATIONS_PAGE_LIMIT, MESSAGE_PAGE_LIMIT } from "./chat.query-keys"

interface FetchInitialChatPageDataServerOptions {
    accessToken: string
    userId: string
    scope: string
    conversationId: string
}

interface FetchChatMessagesPageServerOptions {
    accessToken: string
    conversationId: string
    offset: number
    signal?: AbortSignal
    limit?: number
}

interface FetchInitialConversationsPageServerOptions {
    accessToken: string
    offset: number
    signal?: AbortSignal
    limit?: number
}

export async function fetchInitialChatPageDataServer({
    accessToken,
    userId,
    scope,
    conversationId,
}: FetchInitialChatPageDataServerOptions): Promise<InitialChatPageData> {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })

    const [messagesPage, conversationsPage] = await Promise.all([
        queryClient.fetchQuery(
            chatMessagesPageQueryOptions({
                userId,
                scope,
                conversationId,
                fetchMessagesPage: (options) =>
                    fetchChatMessagesPageServer({ ...options, accessToken }),
            })
        ),
        queryClient.fetchQuery(
            initialConversationsPageQueryOptions({
                userId,
                scope,
                fetchConversationsPage: (options) =>
                    fetchInitialConversationsPageServer({ ...options, accessToken }),
            })
        ),
    ])

    return {
        userId,
        scope,
        conversationId,
        messagesPage,
        conversationsPage,
    }
}

function fetchChatMessagesPageServer({
    accessToken,
    conversationId,
    offset,
    signal,
    limit = MESSAGE_PAGE_LIMIT,
}: FetchChatMessagesPageServerOptions) {
    return fetchServerChatJson(
        `/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
        "Failed to fetch messages",
        chatMessagesPageResponseSchema,
        accessToken,
        signal
    )
}

function fetchInitialConversationsPageServer({
    accessToken,
    offset,
    signal,
    limit = CONVERSATIONS_PAGE_LIMIT,
}: FetchInitialConversationsPageServerOptions) {
    return fetchServerChatJson(
        `/api/conversations?limit=${limit}&offset=${offset}`,
        "Failed to fetch conversations",
        chatConversationsResponseSchema,
        accessToken,
        signal
    )
}

async function fetchServerChatJson<T>(
    path: string,
    fallbackMessage: string,
    schema: v.GenericSchema<unknown, T>,
    accessToken: string,
    signal?: AbortSignal
): Promise<T> {
    const response = await fetch(`${serverEnv.API_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        signal,
    })
    const json = await readJsonResponse(response)

    if (!response.ok) {
        throw new Error(getServerChatErrorMessage(json, fallbackMessage))
    }

    const parsed = safeParseSchema(schema, json)
    if (!parsed.success) {
        console.error(
            `Invalid chat API payload from ${path}:`,
            parsed.error.flatten((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            }))
        )
        throw new Error("Server response invalid.")
    }

    return parsed.data
}

function getServerChatErrorMessage(payload: unknown, fallback: string): string {
    const parsed = v.safeParse(v.looseObject({ message: v.optional(v.string()) }), payload)
    if (!parsed.success) return fallback
    return parsed.output.message || fallback
}
