import { serverEnv } from "@/shared/config/env.server"
import { type ApiProxyOptions, proxyApiRequest } from "./api-proxy-request.server"

export type { PublicDocumentUploadGuard } from "./api-proxy-request.server"

export function apiProxy(
    request: Request,
    endpoint: string,
    accessToken: string | null,
    options?: ApiProxyOptions
): Promise<Response> {
    return proxyApiRequest(request, endpoint, accessToken, serverEnv.API_URL, options)
}
