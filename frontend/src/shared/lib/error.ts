type ErrorContext = Record<string, unknown>

export function logError(message: string, error?: unknown, context?: ErrorContext): void {
    if (import.meta.env.DEV) {
        if (error) {
            console.error(`[Error] ${message}`, error, context)
        } else {
            console.error(`[Error] ${message}`, context)
        }
    }
}

export function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    if (typeof error === "string" && error) return error
    return fallback
}
