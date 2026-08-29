import { afterEach, describe, expect, it } from "bun:test"
import { uploadRequestDocuments } from "../send-request.api"

const originalFetch = globalThis.fetch
let fetchCalls: Array<{
    input: Parameters<typeof fetch>[0]
    init: Parameters<typeof fetch>[1] | undefined
}> = []

function installUploadFetch(payload: unknown) {
    const mockedFetch = Object.assign(
        (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
            fetchCalls.push({ input, init })
            return Promise.resolve(Response.json(payload))
        },
        { preconnect: originalFetch.preconnect }
    ) satisfies typeof fetch

    globalThis.fetch = mockedFetch
}

function createDocumentFile(): File {
    return new File(["request document"], "request-document.pdf", { type: "application/pdf" })
}

afterEach(() => {
    globalThis.fetch = originalFetch
    fetchCalls = []
})

describe("uploadRequestDocuments", () => {
    it("keeps an empty document list valid when no files were selected", async () => {
        installUploadFetch({})

        await expect(uploadRequestDocuments([])).resolves.toEqual([])
        expect(fetchCalls).toHaveLength(0)
    })

    it("returns uploaded document URLs from a successful upload response", async () => {
        const documentUrl = "https://cdn.example.test/request-document.pdf"
        installUploadFetch({ data: { documents: [documentUrl] } })

        await expect(uploadRequestDocuments([createDocumentFile()])).resolves.toEqual([documentUrl])
        expect(fetchCalls).toHaveLength(1)
        expect(fetchCalls[0]?.input).toBe("/api/documents/upload")
    })

    it("keeps the top-level document URLs fallback when nested documents are absent", async () => {
        const documentUrl = "https://cdn.example.test/top-level-document.pdf"
        installUploadFetch({ documents: [documentUrl] })

        await expect(uploadRequestDocuments([createDocumentFile()])).resolves.toEqual([documentUrl])
    })

    it("rejects a successful upload response that omits document URLs", async () => {
        installUploadFetch({})

        await expect(uploadRequestDocuments([createDocumentFile()])).rejects.toThrow(
            "Failed to upload documents: response did not include valid document URLs"
        )
    })

    it("rejects an upload attempt for selected files when the response has no document URLs", async () => {
        installUploadFetch({ data: { documents: [] } })

        await expect(uploadRequestDocuments([createDocumentFile()])).rejects.toThrow(
            "Failed to upload documents: response did not include valid document URLs"
        )
    })

    it("rejects uploaded documents without valid HTTP URLs", async () => {
        installUploadFetch({ data: { documents: ["request-document.pdf"] } })

        await expect(uploadRequestDocuments([createDocumentFile()])).rejects.toThrow(
            "Failed to upload documents: response did not include valid document URLs"
        )
    })
})
