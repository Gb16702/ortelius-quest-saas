import {
    type ApiErrorPayload,
    normalizeApiErrorPayload,
    readJsonResponse,
} from "@/shared/api/http.response"
import { buildApiProxyTarget } from "./api-proxy-target.server"

type RefreshAccessToken = () => Promise<{
    accessToken: string | null
    setCookies?: string[]
}>

export interface ApiProxyOptions {
    body?: unknown
    method?: string
    publicDocumentUploadGuard?: PublicDocumentUploadGuard
    refreshAccessToken?: RefreshAccessToken
}

export interface PublicDocumentUploadGuard {
    maxFileSizeBytes: number
    maxFiles: number
}

interface PublicRoute {
    method: "GET" | "POST"
    pattern: RegExp
}

const PUBLIC_DOCUMENT_UPLOAD_PATH = "documents/upload"
const MULTIPART_FORM_DATA_MEDIA_TYPE = "multipart/form-data"
const MULTIPART_FORM_DATA_OVERHEAD_BYTES_PER_FILE = 16 * 1024

const PUBLIC_ROUTES: PublicRoute[] = [
    { method: "GET", pattern: /^categories\/organizations\/[^/]+$/ },
    { method: "GET", pattern: /^services\/organizations\/[^/]+$/ },
    { method: "GET", pattern: /^organizations\/invitation\/[^/]+$/ },
    { method: "GET", pattern: /^organizations\/[^/]+\/showcase$/ },
    { method: "POST", pattern: /^requests$/ },
    { method: "POST", pattern: /^documents\/upload$/ },
]

function isPublicEndpoint(method: string, path: string): boolean {
    return PUBLIC_ROUTES.some((r) => r.method === method && r.pattern.test(path))
}

function isGraphQLEndpoint(path: string): boolean {
    return path.replace(/\/+$/, "") === "graphql"
}

function isPublicDocumentUploadEndpoint(method: string, path: string): boolean {
    return method === "POST" && path === PUBLIC_DOCUMENT_UPLOAD_PATH
}

function json(data: unknown, status: number, setCookies: string[] = [], sourceHeaders?: Headers) {
    const headers = sourceHeaders ? new Headers(sourceHeaders) : new Headers()
    headers.set("Content-Type", "application/json")
    for (const cookie of setCookies) {
        headers.append("Set-Cookie", cookie)
    }

    return new Response(JSON.stringify(data), {
        status,
        headers,
    })
}

function jsonApiError(error: ApiErrorPayload, status: number, setCookies: string[] = []) {
    return json(error, status, setCookies)
}

function getContentTypeMediaType(contentType: string | null): string | null {
    const mediaType = contentType?.split(";")[0]?.trim().toLowerCase()
    return mediaType || null
}

function getMultipartBoundary(contentType: string | null): string | null {
    if (!contentType) return null

    const match = /(?:^|;)\s*boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
    const boundary = match?.[1] ?? match?.[2]?.trim()

    return boundary || null
}

function getMaxUploadContentLength(guard: PublicDocumentUploadGuard): number {
    return guard.maxFiles * (guard.maxFileSizeBytes + MULTIPART_FORM_DATA_OVERHEAD_BYTES_PER_FILE)
}

function parseContentLength(value: string | null): number | null {
    const normalizedValue = value?.trim()
    if (!normalizedValue) return null
    if (!/^\d+$/.test(normalizedValue)) return null

    const contentLength = Number(normalizedValue)
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) return null

    return contentLength
}

function validatePublicDocumentUploadHeaders(
    request: Request,
    guard: PublicDocumentUploadGuard
): Response | null {
    const contentType = request.headers.get("Content-Type")

    if (
        getContentTypeMediaType(contentType) !== MULTIPART_FORM_DATA_MEDIA_TYPE ||
        !getMultipartBoundary(contentType)
    ) {
        return jsonApiError(
            {
                success: false,
                code: "BAD_REQUEST",
                message: "Document uploads must use multipart/form-data",
            },
            415
        )
    }

    const contentLength = parseContentLength(request.headers.get("Content-Length"))
    const maxContentLength = getMaxUploadContentLength(guard)

    if (contentLength === null) {
        return jsonApiError(
            {
                success: false,
                code: "PAYLOAD_TOO_LARGE",
                message: "Content-Length is required for document uploads",
            },
            413
        )
    }

    if (contentLength > maxContentLength) {
        return jsonApiError(
            {
                success: false,
                code: "PAYLOAD_TOO_LARGE",
                message: "Document upload payload is too large",
            },
            413
        )
    }

    return null
}

async function buildForwardBodyAndHeaders(
    request: Request,
    method: string,
    bodyOption: unknown
): Promise<{ headers: Record<string, string>; body: BodyInit | undefined }> {
    const headers: Record<string, string> = {}
    let body: BodyInit | undefined

    if (bodyOption !== undefined) {
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(bodyOption)
    } else if (method !== "GET" && method !== "HEAD") {
        const contentType = request.headers.get("Content-Type")
        if (contentType) headers["Content-Type"] = contentType
        const buffer = await request.clone().arrayBuffer()
        if (buffer.byteLength > 0) body = buffer
    }

    const accept = request.headers.get("Accept")
    if (accept) headers.Accept = accept

    for (const key of ["traceparent", "tracestate"]) {
        const value = request.headers.get(key)
        if (value) {
            headers[key] = value
        }
    }

    return { headers, body }
}

function responseHeadersWithCookies(response: Response, setCookies: string[]): Headers {
    const headers = new Headers()
    for (const name of [
        "Content-Type",
        "Content-Disposition",
        "Cache-Control",
        "Retry-After",
        "WWW-Authenticate",
        "X-Accel-Buffering",
    ]) {
        const value = response.headers.get(name)
        if (value) headers.set(name, value)
    }
    for (const cookie of setCookies) {
        headers.append("Set-Cookie", cookie)
    }
    return headers
}

function forwardApiRequest(
    request: Request,
    target: URL,
    method: string,
    headers: Record<string, string>,
    body: BodyInit | undefined,
    token: string | null
): Promise<Response> {
    const requestHeaders = { ...headers }
    if (token) requestHeaders.Authorization = `Bearer ${token}`
    return fetch(target, {
        method,
        headers: requestHeaders,
        body,
        signal: request.signal,
    })
}

async function normalizeErrorResponse(
    response: Response,
    setCookies: string[],
    endpoint: string
): Promise<Response> {
    const headers = responseHeadersWithCookies(response, setCookies)

    if (isGraphQLEndpoint(endpoint)) {
        return new Response(response.body, {
            status: response.status,
            headers,
        })
    }

    const payload = await readJsonResponse(response)
    const error = normalizeApiErrorPayload(response.status, payload)

    return json(error, response.status, [], headers)
}

export async function proxyApiRequest(
    request: Request,
    endpoint: string,
    accessToken: string | null,
    apiBaseUrl: string,
    options?: ApiProxyOptions
): Promise<Response> {
    const method = options?.method ?? request.method
    const target = buildApiProxyTarget(endpoint, apiBaseUrl)

    if (!target) {
        return jsonApiError(
            {
                success: false,
                code: "BAD_REQUEST",
                message: "Invalid API endpoint",
            },
            400
        )
    }

    const isPublic = isPublicEndpoint(method, target.path)
    const publicDocumentUploadGuard = isPublicDocumentUploadEndpoint(method, target.path)
        ? options?.publicDocumentUploadGuard
        : undefined

    if (publicDocumentUploadGuard) {
        const validationResponse = validatePublicDocumentUploadHeaders(
            request,
            publicDocumentUploadGuard
        )
        if (validationResponse) return validationResponse
    }

    let currentAccessToken = accessToken
    let refreshedCookies: string[] = []
    let refreshAttempted = false

    async function refreshOnce(): Promise<string | null> {
        if (!options?.refreshAccessToken || refreshAttempted) return null
        refreshAttempted = true
        const refreshed = await options.refreshAccessToken()
        refreshedCookies = refreshed.setCookies ?? []
        return refreshed.accessToken
    }

    if (!currentAccessToken && !isPublic) {
        currentAccessToken = await refreshOnce()
    }

    if (!currentAccessToken && !isPublic) {
        return jsonApiError(
            {
                success: false,
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
            401,
            refreshedCookies
        )
    }

    const { headers, body } = await buildForwardBodyAndHeaders(request, method, options?.body)

    let response: Response
    try {
        response = await forwardApiRequest(
            request,
            target.url,
            method,
            headers,
            body,
            currentAccessToken
        )
        if (response.status === 401 && options?.refreshAccessToken) {
            const refreshedAccessToken = await refreshOnce()
            if (refreshedAccessToken && refreshedAccessToken !== currentAccessToken) {
                currentAccessToken = refreshedAccessToken
                response = await forwardApiRequest(
                    request,
                    target.url,
                    method,
                    headers,
                    body,
                    currentAccessToken
                )
            }
        }
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err
        console.error(`[api-proxy] fetch failed: ${target.url.href}`, err)
        return jsonApiError(
            {
                success: false,
                code: "UPSTREAM_UNAVAILABLE",
                message: "API unreachable",
            },
            502
        )
    }

    if (!response.ok) {
        return normalizeErrorResponse(response, refreshedCookies, target.path)
    }

    return new Response(response.body, {
        status: response.status,
        headers: responseHeadersWithCookies(response, refreshedCookies),
    })
}
