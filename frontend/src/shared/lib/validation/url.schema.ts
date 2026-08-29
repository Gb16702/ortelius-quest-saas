import * as v from "valibot"

function hasAllowedHttpProtocol(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === "https:" || url.protocol === "http:"
    } catch {
        return false
    }
}

export const httpUrlSchema = v.pipe(
    v.string(),
    v.url(),
    v.check(hasAllowedHttpProtocol, "URL must use HTTP or HTTPS")
)

export const nullableHttpUrlSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => (value?.trim() ? value : null)),
    v.nullable(httpUrlSchema)
)

export const optionalHttpUrlSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => (value?.trim() ? value : undefined)),
    v.optional(httpUrlSchema)
)

export const appPathRedirectSchema = v.pipe(
    v.string(),
    v.check((value) => {
        if (!value.startsWith("/") || value.startsWith("//")) return false
        try {
            const parsed = new URL(value, "https://ortelius.local")
            return parsed.origin === "https://ortelius.local"
        } catch {
            return false
        }
    }, "Redirect URL must be an app-relative path")
)

export function getSafeHttpUrl(value: string | null | undefined): string | null {
    if (!value) return null
    const result = v.safeParse(httpUrlSchema, value)
    return result.success ? result.output : null
}

export function getSafeAppRedirectPath(value: string | null | undefined): string | null {
    if (!value) return null
    const result = v.safeParse(appPathRedirectSchema, value)
    return result.success ? result.output : null
}

export function getSafeSameOriginRedirect(
    value: string | null | undefined,
    origin: string
): string | null {
    if (!value) return null

    const appPath = getSafeAppRedirectPath(value)
    if (appPath) return appPath

    const httpUrl = getSafeHttpUrl(value)
    if (!httpUrl) return null

    try {
        const url = new URL(httpUrl)
        if (url.origin !== origin) return null
        return `${url.pathname}${url.search}${url.hash}`
    } catch {
        return null
    }
}
