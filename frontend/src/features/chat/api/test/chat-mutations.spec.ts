import { afterEach, describe, expect, it } from "bun:test"
import {
    createConfirmedTextMessage,
    resolveMemberDmConversation,
    sendChatMessage,
} from "../chat.mutations"

const originalFetch = globalThis.fetch
const originalConsoleError = console.error
let fetchCalls: Array<{
    input: Parameters<typeof fetch>[0]
    init: Parameters<typeof fetch>[1] | undefined
}> = []
let consoleErrors: unknown[][] = []

function installFetch(response: Response) {
    const mockedFetch = Object.assign(
        (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
            fetchCalls.push({ input, init })
            return Promise.resolve(response)
        },
        { preconnect: originalFetch.preconnect }
    ) satisfies typeof fetch

    globalThis.fetch = mockedFetch
}

function buildMessagePayload(metadata?: Record<string, unknown>) {
    return {
        success: true,
        data: {
            id: "message-1",
            content: "hello",
            messageType: "text",
            senderId: "user-1",
            senderName: "Ada Lovelace",
            senderImage: null,
            organizationName: null,
            memberRole: null,
            metadata,
            replyTo: null,
            isEdited: false,
            isDeleted: false,
            createdAt: "2026-05-11T00:00:00.000Z",
            updatedAt: "2026-05-11T00:00:00.000Z",
        },
    }
}

function silenceConsoleError() {
    console.error = (...args: unknown[]) => {
        consoleErrors.push(args)
    }
}

afterEach(() => {
    globalThis.fetch = originalFetch
    console.error = originalConsoleError
    fetchCalls = []
    consoleErrors = []
})

describe("sendChatMessage", () => {
    it("rejects failed send responses with the server message", async () => {
        installFetch(Response.json({ message: "Message service unavailable" }, { status: 500 }))

        await expect(
            sendChatMessage({ conversationId: "conversation-1", content: "hello" })
        ).rejects.toThrow("Message service unavailable")

        expect(fetchCalls).toHaveLength(1)
        expect(fetchCalls[0]?.input).toBe("/api/messages/conversation-1")
    })

    it("rejects successful responses that omit message data", async () => {
        silenceConsoleError()
        installFetch(Response.json({ success: true, message: "Message sent successfully" }))

        await expect(
            sendChatMessage({ conversationId: "conversation-1", content: "hello" })
        ).rejects.toThrow("Server response invalid.")
        expect(consoleErrors).toHaveLength(1)
    })

    it("keeps attachment view and download URLs from the message response", async () => {
        const metadata = {
            attachments: [
                {
                    id: "attachment-1",
                    filename: "stored-photo.png",
                    originalName: "photo.png",
                    size: 1234,
                    mimeType: "image/png",
                    s3Key: "chat-attachments/conversation-1/stored-photo.png",
                    url: "https://cdn.example.test/photo.png",
                    downloadUrl: "https://cdn.example.test/photo.png?download=1",
                    uploadedAt: "2026-05-11T00:00:00.000Z",
                    uploadedBy: "user-1",
                },
            ],
        }
        installFetch(Response.json(buildMessagePayload(metadata)))

        const message = await sendChatMessage({
            conversationId: "conversation-1",
            content: "hello",
        })
        const confirmedMessage = createConfirmedTextMessage({
            messageData: message,
            fallbackContent: "hello",
            currentUser: {
                id: "user-1",
                name: "Ada Lovelace",
                image: null,
            },
        })

        expect(confirmedMessage.metadata?.attachments?.[0]?.url).toBe(
            "https://cdn.example.test/photo.png"
        )
        expect(confirmedMessage.metadata?.attachments?.[0]?.downloadUrl).toBe(
            "https://cdn.example.test/photo.png?download=1"
        )
    })
})

describe("resolveMemberDmConversation", () => {
    it("posts a member DM resolve request and returns the resolved conversation", async () => {
        installFetch(
            Response.json({
                success: true,
                data: {
                    conversationId: "conversation-member-dm",
                    conversationType: "member_dm",
                },
            })
        )

        const result = await resolveMemberDmConversation({
            organizationId: "org-1",
            targetUserId: "user-2",
        })

        expect(result).toEqual({
            conversationId: "conversation-member-dm",
            conversationType: "member_dm",
        })
        expect(fetchCalls[0]?.input).toBe("/api/conversations/resolve")
        expect(fetchCalls[0]?.init?.method).toBe("POST")
        expect(JSON.parse(String(fetchCalls[0]?.init?.body))).toEqual({
            type: "member_dm",
            organizationId: "org-1",
            targetUserId: "user-2",
        })
    })

    it("rejects invalid resolve responses", async () => {
        silenceConsoleError()
        installFetch(Response.json({ success: true, data: { conversationId: "conversation-1" } }))

        await expect(
            resolveMemberDmConversation({
                organizationId: "org-1",
                targetUserId: "user-2",
            })
        ).rejects.toThrow("Server response invalid.")
        expect(consoleErrors).toHaveLength(1)
    })
})
