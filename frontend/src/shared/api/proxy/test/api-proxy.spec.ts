import { afterAll, afterEach, describe, expect, it } from "bun:test"
import { proxyApiRequest } from "../api-proxy-request.server"
import { buildApiProxyTarget } from "../api-proxy-target.server"

const API_BASE_URL = "https://api.example.test"
const PUBLIC_DOCUMENT_UPLOAD_GUARD = {
    maxFileSizeBytes: 10 * 1024 * 1024,
    maxFiles: 5,
}

const originalFetch = globalThis.fetch
let fetchCalls: Array<{
    init: RequestInit | undefined
    url: string
}> = []

function installFetch(response: Response = Response.json({ success: true })) {
    const mockedFetch = Object.assign(
        (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
            const url =
                input instanceof Request
                    ? input.url
                    : input instanceof URL
                      ? input.href
                      : input.toString()
            fetchCalls.push({ init, url })
            return Promise.resolve(
                new Response(response.body, {
                    status: response.status,
                    headers: response.headers,
                    statusText: response.statusText,
                })
            )
        },
        { preconnect: originalFetch.preconnect }
    ) satisfies typeof fetch

    globalThis.fetch = mockedFetch
}

async function readPayload(response: Response): Promise<unknown> {
    return response.json()
}

afterEach(() => {
    globalThis.fetch = originalFetch
    fetchCalls = []
})

afterAll(() => {
    globalThis.fetch = originalFetch
})

describe("buildApiProxyTarget", () => {
    it("keeps normal nested paths under the API prefix", () => {
        const target = buildApiProxyTarget(
            "organizations/org-123/showcase?include=services",
            API_BASE_URL
        )

        expect(target?.path).toBe("organizations/org-123/showcase")
        expect(target?.url.href).toBe(
            "https://api.example.test/api/organizations/org-123/showcase?include=services"
        )
    })

    it.each([
        "../auth/me",
        "%2e%2e/auth/me",
        "%252e%252e/auth/me",
        "%2fadmin",
        "%252fadmin",
        "//host/path",
        "https://host/path",
    ])("rejects ambiguous endpoint %s", (endpoint) => {
        expect(buildApiProxyTarget(endpoint, API_BASE_URL)).toBeNull()
    })
})

describe("proxyApiRequest", () => {
    it.each([
        "../auth/me",
        "%2e%2e/auth/me",
        "%252e%252e/auth/me",
        "%2fadmin",
        "%252fadmin",
        "//host/path",
        "https://host/path",
    ])("returns a local 400 and does not call upstream fetch for %s", async (endpoint) => {
        installFetch()

        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/proxy"),
            endpoint,
            "token",
            API_BASE_URL
        )

        expect(response.status).toBe(400)
        expect(await readPayload(response)).toMatchObject({
            success: false,
            code: "BAD_REQUEST",
        })
        expect(fetchCalls).toEqual([])
    })

    it("forwards normal public API paths through the canonical API target", async () => {
        installFetch(Response.json({ success: true, data: [] }))

        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/categories/organizations/org-123"),
            "categories/organizations/org-123",
            null,
            API_BASE_URL
        )

        expect(response.status).toBe(200)
        expect(fetchCalls.map((call) => call.url)).toEqual([
            "https://api.example.test/api/categories/organizations/org-123",
        ])
    })

    it("forwards public invitation lookup without an access token", async () => {
        installFetch(Response.json({ success: true, data: { invitationId: "invite-123" } }))

        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/organizations/invitation/invite-123"),
            "organizations/invitation/invite-123",
            null,
            API_BASE_URL
        )

        expect(response.status).toBe(200)
        expect(fetchCalls.map((call) => call.url)).toEqual([
            "https://api.example.test/api/organizations/invitation/invite-123",
        ])
    })

    it("does not make invitation mutation paths public", async () => {
        installFetch()

        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/organizations/invitation/invite-123/accept", {
                method: "POST",
            }),
            "organizations/invitation/invite-123/accept",
            null,
            API_BASE_URL
        )

        expect(response.status).toBe(401)
        expect(await readPayload(response)).toMatchObject({
            success: false,
            code: "UNAUTHORIZED",
        })
        expect(fetchCalls).toEqual([])
    })

    it("passes through GraphQL error responses without REST error normalization", async () => {
        installFetch(
            Response.json(
                {
                    errors: [{ message: "GraphQL validation failed" }],
                },
                { status: 400 }
            )
        )

        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/graphql"),
            "graphql?operationName=Probe",
            "token",
            API_BASE_URL,
            {
                body: { query: "query Probe { viewer { id } }" },
                method: "POST",
            }
        )

        expect(response.status).toBe(400)
        expect(await readPayload(response)).toEqual({
            errors: [{ message: "GraphQL validation failed" }],
        })
        expect(fetchCalls.map((call) => call.url)).toEqual([
            "https://api.example.test/api/graphql?operationName=Probe",
        ])
    })

    it("returns a local 415 and does not call upstream fetch for public uploads with the wrong content type", async () => {
        installFetch()

        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/documents/upload", {
                body: JSON.stringify({ file: "not multipart" }),
                headers: {
                    "Content-Length": "24",
                    "Content-Type": "application/json",
                },
                method: "POST",
            }),
            "documents/upload",
            null,
            API_BASE_URL,
            {
                publicDocumentUploadGuard: PUBLIC_DOCUMENT_UPLOAD_GUARD,
            }
        )

        expect(response.status).toBe(415)
        expect(await readPayload(response)).toMatchObject({
            success: false,
            code: "BAD_REQUEST",
        })
        expect(fetchCalls).toEqual([])
    })

    it("returns a local 413 and does not call upstream fetch for public uploads without content length", async () => {
        installFetch()

        const boundary = "----quest-boundary"
        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/documents/upload", {
                body: buildMultipartBody(boundary, 1),
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                },
                method: "POST",
            }),
            "documents/upload",
            null,
            API_BASE_URL,
            {
                publicDocumentUploadGuard: PUBLIC_DOCUMENT_UPLOAD_GUARD,
            }
        )

        expect(response.status).toBe(413)
        expect(await readPayload(response)).toMatchObject({
            success: false,
            code: "PAYLOAD_TOO_LARGE",
        })
        expect(fetchCalls).toEqual([])
    })

    it("returns a local 413 and does not call upstream fetch for oversized public upload content length", async () => {
        installFetch()

        const boundary = "----quest-boundary"
        const maxContentLength =
            PUBLIC_DOCUMENT_UPLOAD_GUARD.maxFiles *
            (PUBLIC_DOCUMENT_UPLOAD_GUARD.maxFileSizeBytes + 16 * 1024)
        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/documents/upload", {
                body: "",
                headers: {
                    "Content-Length": String(maxContentLength + 1),
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                },
                method: "POST",
            }),
            "documents/upload",
            null,
            API_BASE_URL,
            {
                publicDocumentUploadGuard: PUBLIC_DOCUMENT_UPLOAD_GUARD,
            }
        )

        expect(response.status).toBe(413)
        expect(await readPayload(response)).toMatchObject({
            success: false,
            code: "PAYLOAD_TOO_LARGE",
        })
        expect(fetchCalls).toEqual([])
    })

    it("allows multipart framing overhead above the configured file byte limit", async () => {
        installFetch(Response.json({ success: true, data: { documents: [] } }, { status: 201 }))

        const boundary = "----quest-boundary"
        const maxFileBytes =
            PUBLIC_DOCUMENT_UPLOAD_GUARD.maxFiles * PUBLIC_DOCUMENT_UPLOAD_GUARD.maxFileSizeBytes
        const multipartOverhead = PUBLIC_DOCUMENT_UPLOAD_GUARD.maxFiles * 16 * 1024
        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/documents/upload", {
                body: "",
                headers: {
                    "Content-Length": String(maxFileBytes + multipartOverhead),
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                },
                method: "POST",
            }),
            "documents/upload",
            null,
            API_BASE_URL,
            {
                publicDocumentUploadGuard: PUBLIC_DOCUMENT_UPLOAD_GUARD,
            }
        )

        expect(response.status).toBe(201)
        expect(fetchCalls.map((call) => call.url)).toEqual([
            "https://api.example.test/api/documents/upload",
        ])
    })

    it("forwards valid public multipart uploads through the canonical API target", async () => {
        installFetch(Response.json({ success: true, data: { documents: [] } }, { status: 201 }))

        const boundary = "----quest-boundary"
        const body = buildMultipartBody(boundary, 1)
        const response = await proxyApiRequest(
            new Request("https://app.example.test/api/documents/upload", {
                body,
                headers: {
                    "Content-Length": String(new TextEncoder().encode(body).byteLength),
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                },
                method: "POST",
            }),
            "documents/upload",
            null,
            API_BASE_URL,
            {
                publicDocumentUploadGuard: PUBLIC_DOCUMENT_UPLOAD_GUARD,
            }
        )

        expect(response.status).toBe(201)
        expect(fetchCalls.map((call) => call.url)).toEqual([
            "https://api.example.test/api/documents/upload",
        ])
        expect(fetchCalls[0]?.init?.headers).toMatchObject({
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
        })
    })
})

function buildMultipartBody(boundary: string, fileCount: number): string {
    const parts: string[] = []

    for (let index = 0; index < fileCount; index += 1) {
        parts.push(
            `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="file${index}"; filename="request-${index}.pdf"\r\n` +
                "Content-Type: application/pdf\r\n\r\n" +
                "pdf\r\n"
        )
    }

    return `${parts.join("")}--${boundary}--\r\n`
}
