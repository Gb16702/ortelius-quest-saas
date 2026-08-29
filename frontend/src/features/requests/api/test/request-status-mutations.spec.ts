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

import type { RequestsListData, UserRequest } from "../../model/request"
import { requestMutationResponseSchema } from "../../model/schemas/request.schema"
import { createRequest } from "../../model/test/request.factory"
import { useCancelRequest, useRejectRequest, useValidateDraft } from "../request-status.mutations"
import { type RequestScopeKey, requestsKeys } from "../requests.api"

const requestScope: RequestScopeKey = {
    scope: "organization",
    scopeId: "org-123",
}

const REQUEST_ID = "request-1"

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

type StatusResponseBody = { success: boolean; message?: string; code?: string }

function captureNextPatch(url: string, responseBody: StatusResponseBody = { success: true }) {
    return new Promise<CapturedRequest>((resolve) => {
        server.use(
            http.patch(url, async ({ request }) => {
                resolve({
                    url: new URL(request.url).pathname,
                    method: request.method,
                    body: await readJsonBody(request.clone()),
                })
                return HttpResponse.json(responseBody)
            })
        )
    })
}

function listKey(scope: RequestScopeKey) {
    return [...requestsKeys.scope(scope), "list", 1, 10, "", "", "", "", "", ""] as const
}

function seedRequestsList(
    queryClient: QueryClient,
    scope: RequestScopeKey,
    requests: UserRequest[]
) {
    const data: RequestsListData = {
        requests,
        pagination: { total: requests.length, page: 1, limit: 10, totalPages: 1 },
    }
    queryClient.setQueryData(listKey(scope), data)
    return data
}

function readListData(queryClient: QueryClient, scope: RequestScopeKey): RequestsListData {
    const data = queryClient.getQueryData<RequestsListData>(listKey(scope))
    if (!data) throw new Error("Expected requests list data in cache")
    return data
}

describe("request-status mutations", () => {
    setupMswServer()

    describe("useCancelRequest", () => {
        it("patches /api/requests/:id/cancel with no body and resolves the typed response", async () => {
            const captured = captureNextPatch(`/api/requests/${REQUEST_ID}/cancel`)
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useCancelRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync(REQUEST_ID)
            const request = await captured

            expect(request.method).toBe("PATCH")
            expect(request.url).toBe(`/api/requests/${REQUEST_ID}/cancel`)
            expect(request.body).toBeNull()
            expect(() => parseSchema(requestMutationResponseSchema, response)).not.toThrow()
        })

        it("optimistically marks the target request as canceled before the network resolves", async () => {
            let resolveServer: () => void = () => {}
            const serverGate = new Promise<void>((resolve) => {
                resolveServer = resolve
            })
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/cancel`, async () => {
                    await serverGate
                    return HttpResponse.json({ success: true })
                })
            )

            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, lifecycleStatus: "open", closedReason: null }),
                createRequest({
                    id: "request-2",
                    reqNumber: "REQ-0002",
                    lifecycleStatus: "open",
                    closedReason: null,
                }),
            ])

            const { result } = renderHook(() => useCancelRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const pending = result.current.mutateAsync(REQUEST_ID)

            await waitFor(() => {
                const targeted = readListData(queryClient, requestScope).requests.find(
                    (r) => r.id === REQUEST_ID
                )
                expect(targeted?.lifecycleStatus).toBe("closed")
                expect(targeted?.closedReason).toBe("cancelled")
            })

            const untouched = readListData(queryClient, requestScope).requests.find(
                (r) => r.id === "request-2"
            )
            expect(untouched?.lifecycleStatus).toBe("open")
            expect(untouched?.closedReason).toBeNull()

            resolveServer()
            await pending
        })

        it("rolls back the optimistic cancel and surfaces the server error on 403", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/cancel`, () =>
                    HttpResponse.json(
                        {
                            success: false,
                            code: "FORBIDDEN",
                            message: "Not allowed to cancel this request",
                        },
                        { status: 403 }
                    )
                )
            )

            const queryClient = createMutationQueryClient()
            const original = seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, lifecycleStatus: "open", closedReason: null }),
            ])

            const { result } = renderHook(() => useCancelRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync(REQUEST_ID)).rejects.toThrow(
                "Not allowed to cancel this request"
            )

            expect(queryClient.getQueryData<RequestsListData>(listKey(requestScope))).toEqual(
                original
            )
        })

        it("invalidates the request scope after settling (success path)", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/cancel`, () =>
                    HttpResponse.json({ success: true })
                )
            )
            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [createRequest({ id: REQUEST_ID })])

            const { result } = renderHook(() => useCancelRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await result.current.mutateAsync(REQUEST_ID)

            await waitFor(() => {
                expect(queryClient.getQueryState(listKey(requestScope))?.isInvalidated).toBe(true)
            })
        })

        it("invalidates the request scope after settling (error path)", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/cancel`, () =>
                    HttpResponse.json({ success: false, message: "Server error" }, { status: 500 })
                )
            )
            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [createRequest({ id: REQUEST_ID })])

            const { result } = renderHook(() => useCancelRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync(REQUEST_ID)).rejects.toThrow()

            await waitFor(() => {
                expect(queryClient.getQueryState(listKey(requestScope))?.isInvalidated).toBe(true)
            })
        })
    })

    describe("useRejectRequest", () => {
        it("patches /api/requests/:id/reject with the reason body and resolves the typed response", async () => {
            const captured = captureNextPatch(`/api/requests/${REQUEST_ID}/reject`)
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useRejectRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync({
                requestId: REQUEST_ID,
                reason: "Out of capacity",
            })
            const request = await captured

            expect(request.method).toBe("PATCH")
            expect(request.url).toBe(`/api/requests/${REQUEST_ID}/reject`)
            expect(request.body).toEqual({ reason: "Out of capacity" })
            expect(() => parseSchema(requestMutationResponseSchema, response)).not.toThrow()
        })

        it("optimistically marks the target request as rejected and rolls back on server error", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/reject`, () =>
                    HttpResponse.json(
                        { success: false, message: "Cannot reject already-quoted request" },
                        { status: 409 }
                    )
                )
            )
            const queryClient = createMutationQueryClient()
            const original = seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, lifecycleStatus: "open", closedReason: null }),
            ])

            const { result } = renderHook(() => useRejectRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync({ requestId: REQUEST_ID, reason: "test" })
            ).rejects.toThrow("Cannot reject already-quoted request")

            expect(queryClient.getQueryData<RequestsListData>(listKey(requestScope))).toEqual(
                original
            )
        })

        it("invalidates the request scope after settling", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/reject`, () =>
                    HttpResponse.json({ success: true })
                )
            )
            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [createRequest({ id: REQUEST_ID })])

            const { result } = renderHook(() => useRejectRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await result.current.mutateAsync({ requestId: REQUEST_ID, reason: "test" })

            await waitFor(() => {
                expect(queryClient.getQueryState(listKey(requestScope))?.isInvalidated).toBe(true)
            })
        })
    })

    describe("useValidateDraft", () => {
        it("patches /api/requests/:id/validate with no body and resolves the typed response", async () => {
            const captured = captureNextPatch(`/api/requests/${REQUEST_ID}/validate`)
            const queryClient = createMutationQueryClient()
            const { result } = renderHook(() => useValidateDraft(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync(REQUEST_ID)
            const request = await captured

            expect(request.method).toBe("PATCH")
            expect(request.url).toBe(`/api/requests/${REQUEST_ID}/validate`)
            expect(request.body).toBeNull()
            expect(() => parseSchema(requestMutationResponseSchema, response)).not.toThrow()
        })

        it("optimistically promotes the draft to open and rolls back on server validation error", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/validate`, () =>
                    HttpResponse.json(
                        {
                            success: false,
                            code: "VALIDATION_ERROR",
                            message: "Draft missing required fields",
                        },
                        { status: 422 }
                    )
                )
            )
            const queryClient = createMutationQueryClient()
            const original = seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, lifecycleStatus: "draft" }),
            ])

            const { result } = renderHook(() => useValidateDraft(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync(REQUEST_ID)).rejects.toThrow(
                "Draft missing required fields"
            )

            expect(queryClient.getQueryData<RequestsListData>(listKey(requestScope))).toEqual(
                original
            )
        })

        it("invalidates the request scope after settling", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/validate`, () =>
                    HttpResponse.json({ success: true })
                )
            )
            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, lifecycleStatus: "draft" }),
            ])

            const { result } = renderHook(() => useValidateDraft(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await result.current.mutateAsync(REQUEST_ID)

            await waitFor(() => {
                expect(queryClient.getQueryState(listKey(requestScope))?.isInvalidated).toBe(true)
            })
        })
    })
})
