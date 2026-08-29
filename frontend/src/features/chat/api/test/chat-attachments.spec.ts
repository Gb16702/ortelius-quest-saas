import { afterEach, describe, expect, it } from "bun:test"
import { uploadChatAttachments } from "../chat-attachments.api"

const originalFetch = globalThis.fetch
let fetchCalls: Array<{
    input: Parameters<typeof fetch>[0]
    init: Parameters<typeof fetch>[1] | undefined
}> = []

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

function createImageFile(): File {
    return new File(["image"], "photo.png", { type: "image/png" })
}

function buildUploadedAttachmentPayload() {
    return {
        success: true,
        data: {
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
        },
    }
}

afterEach(() => {
    globalThis.fetch = originalFetch
    fetchCalls = []
})

describe("uploadChatAttachments", () => {
    it("returns upload failures for retryable selected files", async () => {
        installFetch(Response.json({ message: "Storage unavailable" }, { status: 500 }))

        await expect(uploadChatAttachments([createImageFile()], "conversation-1")).resolves.toEqual(
            {
                success: false,
                error: "Storage unavailable",
            }
        )
    })

    it("preserves uploaded attachment view and download URLs", async () => {
        installFetch(Response.json(buildUploadedAttachmentPayload()))

        const result = await uploadChatAttachments([createImageFile()], "conversation-1")

        expect(fetchCalls[0]?.input).toBe("/api/messages/conversation-1/attachments")
        expect(result.success).toBe(true)
        expect(result.attachments?.[0]?.url).toBe("https://cdn.example.test/photo.png")
        expect(result.attachments?.[0]?.downloadUrl).toBe(
            "https://cdn.example.test/photo.png?download=1"
        )
    })
})
