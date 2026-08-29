import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/shared/api/http.response"

const NON_RETRYABLE_API_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429])
const NON_RETRYABLE_API_CODES = new Set([
    "BAD_REQUEST",
    "VALIDATION_ERROR",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "RATE_LIMITED",
])

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
    if (error instanceof ApiError) {
        if (NON_RETRYABLE_API_STATUSES.has(error.status)) return false
        if (error.code && NON_RETRYABLE_API_CODES.has(error.code)) return false
    }

    return failureCount < 3
}

export function createAppQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000,
                gcTime: 10 * 60 * 1000,
                retry: shouldRetryQuery,
            },
        },
    })
}
