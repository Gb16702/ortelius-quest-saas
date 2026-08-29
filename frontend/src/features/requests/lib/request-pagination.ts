interface RequestsPaginationResponse {
    total: number
    page?: number | undefined
    limit?: number | undefined
    totalPages?: number | undefined
}

interface RequestsPaginationFallback {
    page: number
    limit: number
}

interface NormalizedRequestsPagination {
    [key: string]: unknown
    total: number
    page: number
    limit: number
    totalPages: number
}

function getPositivePaginationValue(value: number | undefined, fallback: number): number {
    return value && value > 0 ? value : fallback
}

function getTotalPages(value: number | undefined, total: number, limit: number): number {
    if (value && value > 0) return value
    if (total <= 0) return 0

    return Math.ceil(total / limit)
}

export function normalizeRequestsPagination(
    pagination: RequestsPaginationResponse,
    fallback: RequestsPaginationFallback
): NormalizedRequestsPagination {
    const limit = getPositivePaginationValue(pagination.limit, fallback.limit)

    return {
        total: pagination.total,
        page: getPositivePaginationValue(pagination.page, fallback.page),
        limit,
        totalPages: getTotalPages(pagination.totalPages, pagination.total, limit),
    }
}
