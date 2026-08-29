const SCHEME_PREFIX = /^\s*(?:[a-z][a-z0-9+.-]*:)?\/+/i

export function stripSchemePrefix(value: string): string {
    let current = value
    let previous: string
    do {
        previous = current
        current = current.replace(SCHEME_PREFIX, "")
    } while (current !== previous)
    return current.trim()
}

export function normalizeWebsite(value: string | null | undefined): string {
    const bare = stripSchemePrefix(value ?? "")
    return bare === "" ? "" : `https://${bare}`
}

export function isValidHttpsWebsite(value: string): boolean {
    if (!value) return true
    let url: URL
    try {
        url = new URL(value)
    } catch {
        return false
    }
    if (url.protocol !== "https:") return false
    if (!url.hostname) return false
    if (url.username || url.password) return false
    return true
}
