const defaultDevOrigin = "http://localhost:5175"

export function getCurrentOrigin(): string {
    if (typeof window !== "undefined") return window.location.origin

    const fromEnv = process.env.APP_ORIGIN
    if (fromEnv && fromEnv.length > 0) return new URL(fromEnv).origin

    return defaultDevOrigin
}
