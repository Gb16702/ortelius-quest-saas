// Lifecycle scope for this file:
// - `useSubmitQuote` is a submit-only mutation. It has no `onMutate` and no
//   optimistic write into the requests cache. The "optimistic update applies
//   immediately" and "rollback on error" criteria from issue #469 therefore
//   do not apply to this hook — we assert the next-best invariants instead:
//   no cache mutation before the network resolves, and no scope invalidation
//   on error. If optimistic UI is added later (e.g. inserting a draft quote
//   row), extend this file with the gated-server pattern used in
//   `request-status-mutations.spec.ts`.
import { describe, expect, it, mock } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { createElement, type ReactNode } from "react"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { server } from "@/shared/test/msw/msw-server"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"

mock.module("@/shared/ui/toasts", () => ({
    showSuccessToast: mock(() => {}),
    showErrorToast: mock(() => {}),
    showUndoToast: mock(() => {}),
    showRetryErrorToast: mock(() => {}),
}))

import type { QuoteData } from "../../model/request"
import { requestMutationResponseSchema } from "../../model/schemas/request.schema"
import { useSubmitQuote } from "../request-quote.mutations"
import { type RequestScopeKey, requestsKeys } from "../requests.api"

const QUOTES_URL = "/api/quotes"

const requestScope: RequestScopeKey = {
    scope: "organization",
    scopeId: "org-123",
}

const sampleQuoteData: QuoteData = {
    selectedCategories: ["category-1"],
    selectedServices: [{ serviceId: "service-1", included: true, price: 100 }],
    cargoDetails: {
        weight: null,
        volume: null,
        palletCount: null,
        fragility: null,
        dimensions: { length: null, width: null, height: null },
        options: { hazardous: false, insuranceCoverage: false, perishableGoods: false },
    },
    description: "Please include evening delivery.",
    vatRate: 20,
    totalHT: 100,
    totalTTC: 120,
    vatAmount: 20,
    legalDocumentIds: ["550e8400-e29b-41d4-a716-446655440000"],
}

interface CapturedRequest {
    url: string
    method: string
    body: unknown
}

function createMutationQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
            mutations: { retry: false },
        },
    })
}

function createWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return createElement(QueryClientProvider, { client: queryClient }, children)
    }
}

async function readJsonBody(request: Request): Promise<unknown> {
    const text = await request.text()
    if (text === "") return null
    try {
        return JSON.parse(text) as unknown
    } catch {
        return null
    }
}

function captureNextRequest(url: string): Promise<CapturedRequest> {
    return new Promise((resolve) => {
        server.use(
            http.post(url, async ({ request }) => {
                resolve({
                    url: new URL(request.url).pathname,
                    method: request.method,
                    body: await readJsonBody(request.clone()),
                })
                return HttpResponse.json({ success: true, message: "Quote submitted" })
            })
        )
    })
}

describe("request-quote mutations", () => {
    setupMswServer()

    describe("useSubmitQuote", () => {
        it("posts to /api/quotes with the parsed create-quote payload", async () => {
            const captured = captureNextRequest(QUOTES_URL)
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useSubmitQuote(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            result.current.mutate({ requestId: "request-1", quoteData: sampleQuoteData })

            const request = await captured
            expect(request.method).toBe("POST")
            expect(request.url).toBe(QUOTES_URL)
            expect(request.body).toMatchObject({
                requestId: "request-1",
                selectedCategories: ["category-1"],
                description: "Please include evening delivery.",
                vatRate: 20,
                totalHT: 100,
                totalTTC: 120,
                vatAmount: 20,
                legalDocumentIds: ["550e8400-e29b-41d4-a716-446655440000"],
            })
        })

        it("resolves with a payload that parses through requestMutationResponseSchema", async () => {
            server.use(
                http.post(QUOTES_URL, () =>
                    HttpResponse.json({ success: true, message: "Quote submitted" })
                )
            )
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useSubmitQuote(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync({
                requestId: "request-1",
                quoteData: sampleQuoteData,
            })

            expect(() => parseSchema(requestMutationResponseSchema, response)).not.toThrow()
            expect(response.success).toBe(true)
        })

        it("invalidates only the request scope after a successful submission", async () => {
            server.use(http.post(QUOTES_URL, () => HttpResponse.json({ success: true })))
            const queryClient = createMutationQueryClient()
            const scopeKey = requestsKeys.scope(requestScope)
            const otherScopeKey = requestsKeys.scope({
                scope: "organization",
                scopeId: "org-999",
            })
            queryClient.setQueryData([...scopeKey, "list", 1, 10, "", "", "", "", "", ""], {
                requests: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
            })
            queryClient.setQueryData([...otherScopeKey, "list", 1, 10, "", "", "", "", "", ""], {
                requests: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
            })

            const { result } = renderHook(() => useSubmitQuote(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await result.current.mutateAsync({
                requestId: "request-1",
                quoteData: sampleQuoteData,
            })

            await waitFor(() => {
                const matched = queryClient.getQueriesData({ queryKey: scopeKey })
                expect(matched.length).toBeGreaterThan(0)
                for (const [key] of matched) {
                    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
                }
            })
            const otherMatched = queryClient.getQueriesData({ queryKey: otherScopeKey })
            for (const [key] of otherMatched) {
                expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false)
            }
        })

        it("rejects with the typed error message on 400 and does not invalidate the scope", async () => {
            server.use(
                http.post(QUOTES_URL, () =>
                    HttpResponse.json(
                        {
                            success: false,
                            code: "VALIDATION_ERROR",
                            message: "Quote totals do not match",
                        },
                        { status: 400 }
                    )
                )
            )
            const queryClient = createMutationQueryClient()
            const scopeKey = requestsKeys.scope(requestScope)
            const listKey = [...scopeKey, "list", 1, 10, "", "", "", "", "", ""]
            queryClient.setQueryData(listKey, {
                requests: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
            })

            const { result } = renderHook(() => useSubmitQuote(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync({ requestId: "request-1", quoteData: sampleQuoteData })
            ).rejects.toThrow("Quote totals do not match")

            expect(queryClient.getQueryState(listKey)?.isInvalidated ?? false).toBe(false)
        })

        it("rejects with the fallback message when the server returns 500 with no body", async () => {
            server.use(http.post(QUOTES_URL, () => new HttpResponse(null, { status: 500 })))
            const queryClient = createMutationQueryClient()

            const { result } = renderHook(() => useSubmitQuote(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync({ requestId: "request-1", quoteData: sampleQuoteData })
            ).rejects.toThrow("Failed to submit quote")
        })
    })
})
