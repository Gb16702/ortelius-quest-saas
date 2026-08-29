import { describe, expect, it } from "bun:test"
import { QueryClient, type QueryKey } from "@tanstack/react-query"
import { membersKeys } from "@/entities/member"
import type { AssignedUser, RequestData, RequestsListData, UserRequest } from "../../model/request"
import {
    beginRequestAssignmentMutation,
    getRequestAssignmentUndoVariables,
    invalidateRequestAssignmentMutation,
    rollbackRequestAssignmentMutation,
} from "../request-assignment.cache"
import { type RequestScopeKey, requestsKeys } from "../requests.api"

const requestScope = {
    scope: "organization",
    scopeId: "org-123",
} satisfies RequestScopeKey

const otherRequestScope = {
    scope: "organization",
    scopeId: "org-456",
} satisfies RequestScopeKey

const firstListKey = requestsKeys.list({
    ...requestScope,
    page: 1,
    limit: 10,
    search: "",
    lifecycleStatus: "",
    closedReason: "",
    assignedTo: "",
    priority: "",
    fromDate: "",
    toDate: "",
})

const secondListKey = requestsKeys.list({
    ...requestScope,
    page: 2,
    limit: 10,
    search: "REQ",
    lifecycleStatus: "open",
    closedReason: "",
    assignedTo: "",
    priority: "",
    fromDate: "",
    toDate: "",
})

const otherScopeListKey = requestsKeys.list({
    ...otherRequestScope,
    page: 1,
    limit: 10,
    search: "",
    lifecycleStatus: "",
    closedReason: "",
    assignedTo: "",
    priority: "",
    fromDate: "",
    toDate: "",
})

const requestDetailKey = requestsKeys.byNumber(requestScope, "REQ-001")
const otherRequestDetailKey = requestsKeys.byNumber(requestScope, "REQ-002")

const previousAssignedUser = {
    id: "member-old",
    name: "Old Member",
    email: "old@example.test",
    role: "operator",
    image: "https://example.test/old.png",
} satisfies AssignedUser

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })
}

function createRequest(overrides: Partial<UserRequest> = {}): UserRequest {
    const request: UserRequest = {
        id: "request-1",
        reqNumber: "REQ-001",
        lifecycleStatus: "open",
        closedReason: null,
        categories: [],
        services: [],
        comments: null,
        fromDate: "2026-05-11T00:00:00.000Z",
        toDate: "2026-05-12T00:00:00.000Z",
        createdAt: "2026-05-11T00:00:00.000Z",
        updatedAt: "2026-05-11T00:00:00.000Z",
        conversationId: "conversation-1",
        requester: {
            id: "user-123",
            name: "Requester",
            email: "requester@example.test",
            image: null,
        },
        organization: null,
        assignedTo: previousAssignedUser,
    }

    return { ...request, ...overrides }
}

function createRequestDetail(overrides: Partial<RequestData> = {}): RequestData {
    const request: RequestData = {
        id: "request-1",
        reqNumber: "REQ-001",
        requesterId: "user-123",
        receiverOrganizationId: "org-123",
        conversationId: "conversation-1",
        lifecycleStatus: "open",
        closedReason: null,
        categories: [
            {
                id: "category-1",
                name: "General cargo",
                slug: "general-cargo",
            },
        ],
        services: [
            {
                id: "service-1",
                name: "Freight",
                slug: "freight",
                type: "cargo",
            },
        ],
        extraServices: [],
        cargoDetailsId: "cargo-1",
        comments: null,
        documents: [],
        fromDate: "2026-05-11T00:00:00.000Z",
        toDate: "2026-05-12T00:00:00.000Z",
        createdAt: "2026-05-11T00:00:00.000Z",
        updatedAt: "2026-05-11T00:00:00.000Z",
        priority: null,
        requester: {
            id: "user-123",
            name: "Requester",
            email: "requester@example.test",
            image: null,
        },
        organization: {
            id: "org-123",
            name: "Organization",
            slug: "organization",
            logo: null,
        },
        cargoDetails: {
            id: "cargo-1",
            weight: null,
            volume: null,
            palletCount: null,
            fragility: null,
            dimensions: {
                length: null,
                width: null,
                height: null,
            },
            options: {
                hazardous: false,
                insuranceCoverage: false,
                perishableGoods: false,
            },
        },
        assignedTo: previousAssignedUser,
    }

    return { ...request, ...overrides }
}

function createRequestsListData(requests: UserRequest[]): RequestsListData {
    return {
        requests,
        pagination: {
            total: requests.length,
            page: 1,
            limit: 10,
            totalPages: 1,
        },
    }
}

function readRequestsListData(queryClient: QueryClient, queryKey: QueryKey): RequestsListData {
    const data = queryClient.getQueryData<RequestsListData>(queryKey)
    if (!data) throw new Error(`Missing requests list data for ${JSON.stringify(queryKey)}`)

    return data
}

function readRequestAssigneeId(
    queryClient: QueryClient,
    queryKey: QueryKey,
    requestId = "request-1"
): string | null {
    const request = readRequestsListData(queryClient, queryKey).requests.find(
        (item) => item.id === requestId
    )
    if (!request) throw new Error(`Missing request ${requestId}`)

    return request.assignedTo?.id ?? null
}

function readRequestDetailAssigneeId(queryClient: QueryClient, queryKey: QueryKey): string | null {
    const request = queryClient.getQueryData<RequestData>(queryKey)
    if (!request) throw new Error(`Missing request detail data for ${JSON.stringify(queryKey)}`)

    return request.assignedTo?.id ?? null
}

describe("request assignment cache lifecycle", () => {
    it("assigns matching request list queries optimistically and can roll back", async () => {
        const queryClient = createQueryClient()
        const firstOriginalData = createRequestsListData([
            createRequest({ assignedTo: null }),
            createRequest({ id: "request-2", reqNumber: "REQ-002", assignedTo: null }),
        ])
        const secondOriginalData = createRequestsListData([createRequest({ assignedTo: null })])
        const otherScopeOriginalData = createRequestsListData([createRequest({ assignedTo: null })])

        queryClient.setQueryData(firstListKey, firstOriginalData)
        queryClient.setQueryData(secondListKey, secondOriginalData)
        queryClient.setQueryData(otherScopeListKey, otherScopeOriginalData)

        const context = await beginRequestAssignmentMutation(
            queryClient,
            requestScope,
            "request-1",
            {
                memberId: "member-new",
                memberName: "New Member",
                memberEmail: "new@example.test",
                memberRole: "admin",
                memberImage: null,
            }
        )

        expect(readRequestAssigneeId(queryClient, firstListKey)).toBe("member-new")
        expect(readRequestAssigneeId(queryClient, secondListKey)).toBe("member-new")
        expect(readRequestAssigneeId(queryClient, firstListKey, "request-2")).toBeNull()
        expect(readRequestAssigneeId(queryClient, otherScopeListKey)).toBeNull()

        rollbackRequestAssignmentMutation(queryClient, context)

        expect(queryClient.getQueryData<RequestsListData>(firstListKey)).toEqual(firstOriginalData)
        expect(queryClient.getQueryData<RequestsListData>(secondListKey)).toEqual(
            secondOriginalData
        )
        expect(queryClient.getQueryData<RequestsListData>(otherScopeListKey)).toEqual(
            otherScopeOriginalData
        )
    })

    it("preserves the previous assignee for reassign undo", async () => {
        const queryClient = createQueryClient()
        queryClient.setQueryData(firstListKey, createRequestsListData([createRequest()]))

        const context = await beginRequestAssignmentMutation(
            queryClient,
            requestScope,
            "request-1",
            {
                memberId: "member-new",
                memberName: "New Member",
                memberEmail: "new@example.test",
                memberRole: "admin",
                memberImage: null,
            }
        )

        expect(readRequestAssigneeId(queryClient, firstListKey)).toBe("member-new")
        expect(context.previousAssignee).toEqual({
            memberId: "member-old",
            memberName: "Old Member",
            memberEmail: "old@example.test",
            memberRole: "operator",
            memberImage: "https://example.test/old.png",
        })
        expect(getRequestAssignmentUndoVariables("request-1", context)).toEqual({
            requestId: "request-1",
            memberId: "member-old",
        })
    })

    it("updates matching request detail queries optimistically and can roll back", async () => {
        const queryClient = createQueryClient()
        const originalDetail = createRequestDetail({ assignedTo: null })
        const otherDetail = createRequestDetail({
            id: "request-2",
            reqNumber: "REQ-002",
            assignedTo: null,
        })

        queryClient.setQueryData(requestDetailKey, originalDetail)
        queryClient.setQueryData(otherRequestDetailKey, otherDetail)

        const context = await beginRequestAssignmentMutation(
            queryClient,
            requestScope,
            "request-1",
            {
                memberId: "member-new",
                memberName: "New Member",
                memberEmail: "new@example.test",
                memberRole: "admin",
                memberImage: null,
            }
        )

        expect(readRequestDetailAssigneeId(queryClient, requestDetailKey)).toBe("member-new")
        expect(readRequestDetailAssigneeId(queryClient, otherRequestDetailKey)).toBeNull()

        rollbackRequestAssignmentMutation(queryClient, context)

        expect(queryClient.getQueryData<RequestData>(requestDetailKey)).toEqual(originalDetail)
        expect(queryClient.getQueryData<RequestData>(otherRequestDetailKey)).toEqual(otherDetail)
    })

    it("restores the previous assignee when an unassign rolls back", async () => {
        const queryClient = createQueryClient()
        const originalData = createRequestsListData([createRequest()])
        queryClient.setQueryData(firstListKey, originalData)

        const context = await beginRequestAssignmentMutation(
            queryClient,
            requestScope,
            "request-1",
            null
        )

        expect(readRequestAssigneeId(queryClient, firstListKey)).toBeNull()

        rollbackRequestAssignmentMutation(queryClient, context)

        expect(queryClient.getQueryData<RequestsListData>(firstListKey)).toEqual(originalData)
    })

    it("invalidates the request scope and member profile prefix after assignment settles", async () => {
        const queryClient = createQueryClient()
        const profileKey = membersKeys.profile("org-123", "member-old")
        const memberListKey = membersKeys.lists("org-123")

        queryClient.setQueryData(firstListKey, createRequestsListData([createRequest()]))
        queryClient.setQueryData(otherScopeListKey, createRequestsListData([createRequest()]))
        queryClient.setQueryData(profileKey, { userId: "member-old" })
        queryClient.setQueryData(memberListKey, { members: [] })

        await invalidateRequestAssignmentMutation(queryClient, requestScope)

        expect(queryClient.getQueryState(firstListKey)?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState(profileKey)?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState(otherScopeListKey)?.isInvalidated).toBe(false)
        expect(queryClient.getQueryState(memberListKey)?.isInvalidated).toBe(false)
    })
})
