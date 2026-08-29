import {
    getAccessTokenFromRequestCookies,
    isTrustedMutationRequest,
    refreshAuthSession,
} from "../../features/auth/index.server"
import { REQUEST_DOCUMENT_FILE_CONFIG } from "../../features/requests/index.server"
import { apiProxy, type PublicDocumentUploadGuard } from "../../shared/api/proxy/api-proxy.server"

const bodylessMethods = new Set(["GET", "HEAD"])
const apiPathPrefix = "/api"

const publicDocumentUploadGuard = {
    maxFileSizeBytes: REQUEST_DOCUMENT_FILE_CONFIG.maxSize,
    maxFiles: REQUEST_DOCUMENT_FILE_CONFIG.maxFiles,
} satisfies PublicDocumentUploadGuard

export async function handleApiProxyRequest(request: Request): Promise<Response> {
    if (!bodylessMethods.has(request.method) && !isTrustedMutationRequest(request)) {
        return Response.json(
            {
                success: false,
                code: "FORBIDDEN",
                message: "Forbidden",
            },
            { status: 403 }
        )
    }

    const accessToken = getAccessTokenFromRequestCookies(request)
    return apiProxy(request, getApiProxyEndpoint(request), accessToken, {
        publicDocumentUploadGuard,
        refreshAccessToken: () => refreshAuthSession(request),
    })
}

function getApiProxyEndpoint(request: Request): string {
    const url = new URL(request.url)
    const path = url.pathname.slice(apiPathPrefix.length).replace(/^\/+/, "")
    const search = url.searchParams.toString()

    return `${path}${search ? `?${search}` : ""}`
}
