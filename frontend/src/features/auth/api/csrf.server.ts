import { serverEnv } from "@/shared/config/env.server"

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

function runtimeEnv(): string {
    return serverEnv.NODE_ENV
}

function originFromHeader(value: string | null): string | null {
    if (!value) return null
    try {
        return new URL(value).origin
    } catch {
        return null
    }
}

function isMutationMethod(method: string): boolean {
    return !SAFE_METHODS.has(method.toUpperCase())
}

export function isTrustedMutationRequest(request: Request): boolean {
    if (!isMutationMethod(request.method)) return true
    if (runtimeEnv() !== "production") return true

    const requestOrigin = new URL(request.url).origin
    const origin = originFromHeader(request.headers.get("Origin"))
    if (origin) return origin === requestOrigin

    const referer = originFromHeader(request.headers.get("Referer"))
    if (referer) return referer === requestOrigin

    return false
}
