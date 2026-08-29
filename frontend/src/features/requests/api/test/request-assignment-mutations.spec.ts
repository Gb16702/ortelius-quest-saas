import { describe, expect, it, mock } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { createElement, type ReactNode } from "react"
import { membersKeys } from "@/entities/member"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { server } from "@/shared/test/msw/msw-server"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"

mock.module("@/shared/ui/toasts", () => ({
    showSuccessToast: mock(() => {}),
    showErrorToast: mock(() => {}),
    showUndoToast: mock(() => {}),
    showRetryErrorToast: mock(() => {}),
}))

import type { AssignedUser, RequestsListData, UserRequest } from "../../model/request"
import { requestMutationResponseSchema } from "../../model/schemas/request.schema"
import { createRequest } from "../../model/test/request.factory"
import {
    useAssignRequest,
    useReassignRequest,
    useUnassignRequest,
} from "../request-assignment.mutations"
import { type RequestScopeKey, requestsKeys } from "../requests.api"

const requestScope: RequestScopeKey = {
    scope: "organization",
    scopeId: "org-123",
}

const REQUEST_ID = "request-1"

const ORIGINAL_ASSIGNEE: AssignedUser = {
    id: "member-old",
    name: "Old Member",
    email: "old@example.test",
    role: "operator",
    image: null,
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

type AssignmentMethod = "post" | "patch" | "delete"
type AssignmentResponseBody = { success: boolean; message?: string; code?: string }

function captureNext(
    method: AssignmentMethod,
    url: string,
    responseBody: AssignmentResponseBody = { success: true }
) {
    return new Promise<CapturedRequest>((resolve) => {
        const resolver = async ({ request }: { request: Request }) => {
            resolve({
                url: new URL(request.url).pathname,
                method: request.method,
                body: await readJsonBody(request.clone()),
            })
            return HttpResponse.json(responseBody)
        }
        const handler =
            method === "post"
                ? http.post(url, resolver)
                : method === "patch"
                  ? http.patch(url, resolver)
                  : http.delete(url, resolver)
        server.use(handler)
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

function findRequestInCache(
    queryClient: QueryClient,
    scope: RequestScopeKey,
    requestId: string
): UserRequest | undefined {
    return readListData(queryClient, scope).requests.find((r) => r.id === requestId)
}

describe("request-assignment mutations", () => {
    setupMswServer()

    describe("useAssignRequest", () => {
        it("posts to /api/requests/:id/assign with the assignedToId body and resolves the typed response", async () => {
            const captured = captureNext("post", `/api/requests/${REQUEST_ID}/assign`)
            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: null }),
            ])

            const { result } = renderHook(() => useAssignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const successData = await result.current.mutateAsync({
                requestId: REQUEST_ID,
                memberId: "member-new",
                memberName: "New Member",
                memberEmail: "new@example.test",
                memberRole: "admin",
                memberImage: null,
            })
            const request = await captured

            expect(request.method).toBe("POST")
            expect(request.url).toBe(`/api/requests/${REQUEST_ID}/assign`)
            expect(request.body).toEqual({ assignedToId: "member-new" })
            expect(() =>
                parseSchema(requestMutationResponseSchema, successData.response)
            ).not.toThrow()
            expect(successData.memberId).toBe("member-new")
        })

        it("optimistically writes the new assignee into the cache before the network resolves", async () => {
            let resolveServer: () => void = () => {}
            const serverGate = new Promise<void>((resolve) => {
                resolveServer = resolve
            })
            server.use(
                http.post(`/api/requests/${REQUEST_ID}/assign`, async () => {
                    await serverGate
                    return HttpResponse.json({ success: true })
                })
            )
            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: null }),
            ])

            const { result } = renderHook(() => useAssignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const pending = result.current.mutateAsync({
                requestId: REQUEST_ID,
                memberId: "member-new",
                memberName: "New Member",
                memberEmail: "new@example.test",
                memberRole: "admin",
                memberImage: null,
            })

            await waitFor(() => {
                const assignee = findRequestInCache(
                    queryClient,
                    requestScope,
                    REQUEST_ID
                )?.assignedTo
                expect(assignee?.id).toBe("member-new")
                expect(assignee?.name).toBe("New Member")
            })

            resolveServer()
            await pending
        })

        it("rolls back the optimistic assignee when the assignment fails on the server", async () => {
            server.use(
                http.post(`/api/requests/${REQUEST_ID}/assign`, () =>
                    HttpResponse.json(
                        { success: false, message: "Member not part of the organization" },
                        { status: 403 }
                    )
                )
            )
            const queryClient = createMutationQueryClient()
            const original = seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: null }),
            ])

            const { result } = renderHook(() => useAssignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync({
                    requestId: REQUEST_ID,
                    memberId: "member-new",
                    memberName: "New Member",
                    memberEmail: "new@example.test",
                    memberRole: "admin",
                    memberImage: null,
                })
            ).rejects.toThrow("Member not part of the organization")

            expect(queryClient.getQueryData<RequestsListData>(listKey(requestScope))).toEqual(
                original
            )
        })

        it("invalidates both the request scope and the member profile prefix after settling", async () => {
            server.use(
                http.post(`/api/requests/${REQUEST_ID}/assign`, () =>
                    HttpResponse.json({ success: true })
                )
            )
            const queryClient = createMutationQueryClient()
            const memberProfilesKey = membersKeys.profiles()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: null }),
            ])
            queryClient.setQueryData(memberProfilesKey, { profiles: [] })
            const unrelatedScope: RequestScopeKey = { scope: "organization", scopeId: "org-999" }
            seedRequestsList(queryClient, unrelatedScope, [createRequest({ id: "other" })])

            const { result } = renderHook(() => useAssignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await result.current.mutateAsync({
                requestId: REQUEST_ID,
                memberId: "member-new",
                memberName: "New Member",
                memberEmail: "new@example.test",
                memberRole: "admin",
                memberImage: null,
            })

            await waitFor(() => {
                expect(queryClient.getQueryState(listKey(requestScope))?.isInvalidated).toBe(true)
                expect(queryClient.getQueryState(memberProfilesKey)?.isInvalidated).toBe(true)
            })
            // Unrelated scope is left untouched (no over-invalidation).
            expect(queryClient.getQueryState(listKey(unrelatedScope))?.isInvalidated ?? false).toBe(
                false
            )
        })
    })

    describe("useReassignRequest", () => {
        it("patches /api/requests/:id/assign with the new assignedToId and resolves the typed response", async () => {
            const captured = captureNext("patch", `/api/requests/${REQUEST_ID}/assign`)
            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: ORIGINAL_ASSIGNEE }),
            ])

            const { result } = renderHook(() => useReassignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const successData = await result.current.mutateAsync({
                requestId: REQUEST_ID,
                memberId: "member-new",
                memberName: "New Member",
                memberEmail: "new@example.test",
                memberRole: "admin",
                memberImage: null,
            })
            const request = await captured

            expect(request.method).toBe("PATCH")
            expect(request.url).toBe(`/api/requests/${REQUEST_ID}/assign`)
            expect(request.body).toEqual({ assignedToId: "member-new" })
            expect(() =>
                parseSchema(requestMutationResponseSchema, successData.response)
            ).not.toThrow()
        })

        it("rolls back to the previous assignee snapshot when the reassign fails on the server", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/assign`, () =>
                    HttpResponse.json(
                        { success: false, message: "Reassignment forbidden" },
                        { status: 403 }
                    )
                )
            )
            const queryClient = createMutationQueryClient()
            const original = seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: ORIGINAL_ASSIGNEE }),
            ])

            const { result } = renderHook(() => useReassignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(
                result.current.mutateAsync({
                    requestId: REQUEST_ID,
                    memberId: "member-new",
                    memberName: "New Member",
                    memberEmail: "new@example.test",
                    memberRole: "admin",
                    memberImage: null,
                })
            ).rejects.toThrow("Reassignment forbidden")

            expect(queryClient.getQueryData<RequestsListData>(listKey(requestScope))).toEqual(
                original
            )
        })

        it("invalidates request scope and member profiles after a successful reassignment", async () => {
            server.use(
                http.patch(`/api/requests/${REQUEST_ID}/assign`, () =>
                    HttpResponse.json({ success: true })
                )
            )
            const queryClient = createMutationQueryClient()
            const memberProfilesKey = membersKeys.profiles()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: ORIGINAL_ASSIGNEE }),
            ])
            queryClient.setQueryData(memberProfilesKey, { profiles: [] })

            const { result } = renderHook(() => useReassignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await result.current.mutateAsync({
                requestId: REQUEST_ID,
                memberId: "member-new",
                memberName: "New Member",
                memberEmail: "new@example.test",
                memberRole: "admin",
                memberImage: null,
            })

            await waitFor(() => {
                expect(queryClient.getQueryState(listKey(requestScope))?.isInvalidated).toBe(true)
                expect(queryClient.getQueryState(memberProfilesKey)?.isInvalidated).toBe(true)
            })
        })
    })

    describe("useUnassignRequest", () => {
        it("deletes /api/requests/:id/assign with no body and resolves the typed response", async () => {
            const captured = captureNext("delete", `/api/requests/${REQUEST_ID}/assign`)
            const queryClient = createMutationQueryClient()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: ORIGINAL_ASSIGNEE }),
            ])

            const { result } = renderHook(() => useUnassignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            const response = await result.current.mutateAsync(REQUEST_ID)
            const request = await captured

            expect(request.method).toBe("DELETE")
            expect(request.url).toBe(`/api/requests/${REQUEST_ID}/assign`)
            expect(request.body).toBeNull()
            expect(() => parseSchema(requestMutationResponseSchema, response)).not.toThrow()
        })

        it("optimistically clears the assignee and rolls back on server error", async () => {
            server.use(
                http.delete(`/api/requests/${REQUEST_ID}/assign`, () =>
                    HttpResponse.json(
                        { success: false, message: "Cannot unassign last operator" },
                        { status: 409 }
                    )
                )
            )
            const queryClient = createMutationQueryClient()
            const original = seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: ORIGINAL_ASSIGNEE }),
            ])

            const { result } = renderHook(() => useUnassignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await expect(result.current.mutateAsync(REQUEST_ID)).rejects.toThrow(
                "Cannot unassign last operator"
            )

            expect(queryClient.getQueryData<RequestsListData>(listKey(requestScope))).toEqual(
                original
            )
        })

        it("invalidates request scope and member profiles after settling", async () => {
            server.use(
                http.delete(`/api/requests/${REQUEST_ID}/assign`, () =>
                    HttpResponse.json({ success: true })
                )
            )
            const queryClient = createMutationQueryClient()
            const memberProfilesKey = membersKeys.profiles()
            seedRequestsList(queryClient, requestScope, [
                createRequest({ id: REQUEST_ID, assignedTo: ORIGINAL_ASSIGNEE }),
            ])
            queryClient.setQueryData(memberProfilesKey, { profiles: [] })

            const { result } = renderHook(() => useUnassignRequest(requestScope), {
                wrapper: createWrapper(queryClient),
            })

            await result.current.mutateAsync(REQUEST_ID)

            await waitFor(() => {
                expect(queryClient.getQueryState(listKey(requestScope))?.isInvalidated).toBe(true)
                expect(queryClient.getQueryState(memberProfilesKey)?.isInvalidated).toBe(true)
            })
        })
    })
})
