import type { AssistantRuntimeContext } from "./quest-assistant"

export function buildAssistantRuntimeContext(
    organizationId: string | undefined
): AssistantRuntimeContext {
    return {
        ...(organizationId ? { organizationId } : {}),
        routePath: getCurrentRoutePath(),
    }
}

export function getCurrentRoutePath(): string | undefined {
    if (typeof window === "undefined") return undefined

    return `${window.location.pathname}${window.location.search}`
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message
    }

    return "Assistant request failed"
}
