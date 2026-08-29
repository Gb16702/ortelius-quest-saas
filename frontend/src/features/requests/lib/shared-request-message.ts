interface CreateSharedRequestMessageOptions {
    actorName?: string | null
    fallbackActorName: string
    requestId: string
    requestNumber: string
}

export function createSharedRequestMessage({
    actorName,
    fallbackActorName,
    requestId,
    requestNumber,
}: CreateSharedRequestMessageOptions) {
    const displayName = actorName?.trim() || fallbackActorName

    return {
        content: `${displayName} shared a request`,
        metadata: {
            type: "request_shared",
            requestId,
            requestNumber,
        },
    }
}
