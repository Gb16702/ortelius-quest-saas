interface ChatSystemEventMetadata {
    systemEventKey?: unknown
    systemEventParams?: unknown
}

interface FormatChatSystemEventOptions {
    content: string
    metadata?: ChatSystemEventMetadata | null
    t: (key: string, options?: Record<string, unknown>) => string
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function formatChatSystemEvent({
    content,
    metadata,
    t,
}: FormatChatSystemEventOptions): string {
    if (typeof metadata?.systemEventKey === "string") {
        const params = isRecord(metadata.systemEventParams) ? metadata.systemEventParams : {}
        return t(`systemEvent.${metadata.systemEventKey}`, {
            ...params,
            defaultValue: content,
        })
    }

    return content
}
