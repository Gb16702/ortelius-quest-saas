import { afterAll, afterEach, describe, expect, it } from "bun:test"
import type { IncomingWebSocketMessage } from "../web-socket"

const importEnvDefaults = {
    VITE_API_URL: "http://localhost:3000",
    VITE_WS_URL: "ws://localhost:3000",
    VITE_PORTAL_ACCOUNT_URL: "http://localhost:3001",
} satisfies Record<string, string>

const originalImportEnv = new Map(
    Object.keys(importEnvDefaults).map((key) => [key, process.env[key]])
)

for (const [key, value] of Object.entries(importEnvDefaults)) {
    process.env[key] = value
}

const { WebSocketClient } = await import("../web-socket.client")

const originalWebSocket = globalThis.WebSocket
const constructedUrls: string[] = []
const webSockets: MockWebSocket[] = []

class MockWebSocket extends EventTarget {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3

    readonly url: string
    readonly protocol = ""
    readonly extensions = ""
    readonly bufferedAmount = 0
    readonly binaryType = "blob"
    readyState = MockWebSocket.CONNECTING
    onopen: ((event: Event) => void) | null = null
    onclose: ((event: CloseEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    onmessage: ((event: MessageEvent) => void) | null = null
    sentMessages: string[] = []
    closeCode: number | undefined
    closeReason: string | undefined

    constructor(url: string | URL) {
        super()
        this.url = url.toString()
        constructedUrls.push(this.url)
        webSockets.push(this)
    }

    close(code?: number, reason?: string): void {
        this.closeCode = code
        this.closeReason = reason
        this.readyState = MockWebSocket.CLOSED
    }

    open(): void {
        this.readyState = MockWebSocket.OPEN
        this.onopen?.(new Event("open"))
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        if (typeof data === "string") {
            this.sentMessages.push(data)
        }
    }
}

function installMockWebSocket(): void {
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
}

afterEach(() => {
    globalThis.WebSocket = originalWebSocket
    constructedUrls.length = 0
    webSockets.length = 0
})

afterAll(() => {
    for (const [key, value] of originalImportEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

describe("WebSocketClient", () => {
    it("does not open a socket when a pending auth ticket resolves after close", async () => {
        installMockWebSocket()

        let resolveTicket: (ticket: string | null) => void = () => {}
        const client = new WebSocketClient({
            url: "ws://example.test/api/ws",
            getAuthTicket: () =>
                new Promise<string | null>((resolve) => {
                    resolveTicket = resolve
                }),
        })

        client.connect()
        client.close(1000, "Identity changed")
        resolveTicket("ticket-a")

        await Promise.resolve()
        await Promise.resolve()

        expect(constructedUrls).toEqual([])
    })

    it("clears a cached auth ticket when closed", () => {
        installMockWebSocket()

        const client = new WebSocketClient({
            url: "ws://example.test/api/ws",
            getAuthTicket: () => null,
        })

        client.setAuthTicket("ticket-a")
        client.close(1000, "Identity changed")
        client.connect()

        expect(constructedUrls).toEqual(["ws://example.test/api/ws"])
    })

    it("ignores close events from a stale socket after reconnecting", () => {
        installMockWebSocket()

        const reconnectingAttempts: number[] = []
        const client = new WebSocketClient({
            url: "ws://example.test/api/ws",
            getAuthTicket: () => "ticket-a",
            onReconnecting: (attempt) => {
                reconnectingAttempts.push(attempt)
            },
        })

        client.connect()
        client.close(1000, "Identity changed")
        client.setAuthTicketProvider(() => "ticket-b")
        client.connect()
        webSockets[0]?.onclose?.({ code: 1000, reason: "" } as CloseEvent)

        expect(constructedUrls).toEqual([
            "ws://example.test/api/ws?ticket=ticket-a",
            "ws://example.test/api/ws?ticket=ticket-b",
        ])
        expect(reconnectingAttempts).toEqual([])
    })

    it("flushes queued durable chat messages when the socket opens", () => {
        installMockWebSocket()

        const client = new WebSocketClient({
            url: "ws://example.test/api/ws",
            getAuthTicket: () => null,
        })
        const message = {
            type: "message:new",
            conversationId: "conversation-1",
            data: {
                id: "message-1",
                content: "Hello",
                senderId: "user-1",
                createdAt: "2026-05-11T00:00:00.000Z",
                updatedAt: "2026-05-11T00:00:00.000Z",
            },
            timestamp: "2026-05-11T00:00:00.000Z",
        } as const

        client.connect()

        expect(client.send(message)).toBe(false)
        expect(client.queuedMessages).toBe(1)

        webSockets[0]?.open()

        expect(webSockets[0]?.sentMessages.map((payload) => JSON.parse(payload))).toEqual([message])
        expect(client.queuedMessages).toBe(0)

        client.close(1000, "Test complete")
    })

    it("drops offline typing events instead of replaying stale state on reconnect", () => {
        installMockWebSocket()

        const client = new WebSocketClient({
            url: "ws://example.test/api/ws",
            getAuthTicket: () => null,
        })
        const message = {
            type: "chat:typing",
            conversationId: "conversation-1",
            isTyping: true,
            timestamp: "2026-05-11T00:00:00.000Z",
        } as const

        client.connect()

        expect(client.send(message)).toBe(false)
        expect(client.queuedMessages).toBe(0)

        webSockets[0]?.open()

        expect(webSockets[0]?.sentMessages).toEqual([])

        client.close(1000, "Test complete")
    })

    it("queues offline active-conversation events so the open conversation is announced on reconnect", () => {
        installMockWebSocket()

        const client = new WebSocketClient({
            url: "ws://example.test/api/ws",
            getAuthTicket: () => null,
        })
        const message = {
            type: "conversation:set_active",
            conversationId: "conversation-1",
            timestamp: "2026-05-11T00:00:00.000Z",
        } as const

        client.connect()

        expect(client.send(message)).toBe(false)
        expect(client.queuedMessages).toBe(1)

        webSockets[0]?.open()

        expect(webSockets[0]?.sentMessages.map((sentMessage) => JSON.parse(sentMessage))).toEqual([
            message,
        ])

        client.close(1000, "Test complete")
    })

    it("drops offline presence subscription events instead of replaying stale interest on reconnect", () => {
        installMockWebSocket()

        const client = new WebSocketClient({
            url: "ws://example.test/api/ws",
            getAuthTicket: () => null,
        })
        const message: IncomingWebSocketMessage = {
            type: "presence:unsubscribe",
            userIds: ["user-2"],
            timestamp: "2026-05-11T00:00:00.000Z",
        }

        client.connect()

        expect(client.send(message)).toBe(false)
        expect(client.queuedMessages).toBe(0)

        webSockets[0]?.open()

        expect(webSockets[0]?.sentMessages).toEqual([])

        client.close(1000, "Test complete")
    })

    it("uses a browser-allowed private close code when heartbeat expires", async () => {
        installMockWebSocket()

        const client = new WebSocketClient({
            url: "ws://example.test/api/ws",
            getAuthTicket: () => null,
            autoReconnect: false,
            heartbeatInterval: 1,
            heartbeatTimeout: 0,
        })

        client.connect()
        webSockets[0]?.open()

        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(webSockets[0]?.closeCode).toBe(4000)
        expect(webSockets[0]?.closeReason).toBe("Heartbeat timeout - no server ping")

        client.close(1000, "Test complete")
    })
})
