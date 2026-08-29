import type { FavoriteItem } from "@/entities/favorite"

interface RequestFavoriteSource {
    id: string
    reqNumber: string
    createdAt: string
    requester: {
        name: string
        email: string
    }
}

export function createRequestOptimisticFavorite(
    request: RequestFavoriteSource,
    organizationId: string
): FavoriteItem {
    return {
        id: `optimistic:request:${request.id}`,
        entityType: "request",
        entityId: request.id,
        organizationId,
        label: request.reqNumber,
        subtitle: request.requester.name,
        createdAt: request.createdAt,
        meta: {
            requestNumber: request.reqNumber,
            requesterName: request.requester.name,
            requesterEmail: request.requester.email,
        },
    }
}
