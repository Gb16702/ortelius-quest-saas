import { serverEnv } from "./env.server"

function hasUnsafePathCharacter(path: string): boolean {
    for (let index = 0; index < path.length; index += 1) {
        const charCode = path.charCodeAt(index)
        if (charCode <= 0x20 || charCode === 0x7f) return true
    }

    return false
}

export function isCanonicalAppPath(path: string): boolean {
    if (
        !path.startsWith("/") ||
        path.startsWith("//") ||
        path.includes("\\") ||
        hasUnsafePathCharacter(path)
    ) {
        return false
    }

    return new URL(path, serverEnv.APP_ORIGIN).origin === serverEnv.APP_ORIGIN
}

export function buildCanonicalAppUrl(path: string): URL {
    if (!isCanonicalAppPath(path)) {
        throw new Error("Canonical app URL path must be an absolute local path")
    }

    return new URL(path, serverEnv.APP_ORIGIN)
}
