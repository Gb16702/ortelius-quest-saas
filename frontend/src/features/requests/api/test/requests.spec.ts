import { afterEach, describe, expect, it } from "bun:test"
import { parseOptionalSearchParam } from "@/shared/lib/validation/search-params"
import {
    requestNumberSearchSchema,
    requestSheetFromTeamChatSearchSchema,
    requestSheetTeamChatOrganizationIdSearchSchema,
} from "../../model/request-search-params"
import {
    buildRequestByNumberEndpoint,
    createFirstRequestsListQueryParamsFromSearchParams,
    createRequestScopeKey,
    fetchRequestsPage,
} from "../requests.api"

const originalFetch = globalThis.fetch
let fetchUrls: string[] = []

const requestListPayload = {
    data: {
        requests: [
            {
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
                    name: "Ada Lovelace",
                    email: "ada@example.com",
                    image: null,
                },
                organization: {
                    id: "org-123",
                    name: "Ortelius Logistics",
                    slug: "ortelius-logistics",
                    logo: null,
                },
            },
        ],
        pagination: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
        },
    },
}

const flatPersonalRequestListPayload = {
    data: {
        requests: [
            {
                id: "request-1",
                reqNumber: "QA-REQ-ATLAS-001",
                lifecycleStatus: "open",
                closedReason: null,
                categories: [],
                services: [],
                comments: null,
                fromDate: "2026-05-11T00:00:00.000Z",
                toDate: "2026-05-12T00:00:00.000Z",
                createdAt: "2026-05-11T00:00:00.000Z",
                updatedAt: "2026-05-11T00:00:00.000Z",
                conversationId: null,
                requesterId: "user-123",
                requesterName: "Ada Lovelace",
                requesterEmail: "ada@example.com",
                organization: {
                    id: "org-123",
                    name: "Ortelius Logistics",
                    slug: "ortelius-logistics",
                    logo: null,
                },
            },
        ],
        pagination: {
            total: 1,
        },
    },
}

function installFetch(response: Response = Response.json(requestListPayload)) {
    const mockedFetch = Object.assign(
        (input: Parameters<typeof fetch>[0]) => {
            const url =
                input instanceof Request
                    ? input.url
                    : input instanceof URL
                      ? input.href
                      : input.toString()
            fetchUrls.push(url)
            return Promise.resolve(
                new Response(response.body, {
                    status: response.status,
                    headers: response.headers,
                    statusText: response.statusText,
                })
            )
        },
        { preconnect: originalFetch.preconnect }
    ) satisfies typeof fetch

    globalThis.fetch = mockedFetch
}

afterEach(() => {
    globalThis.fetch = originalFetch
    fetchUrls = []
})

describe("createRequestScopeKey", () => {
    it("creates an organization scope only from a real organization id", () => {
        expect(createRequestScopeKey({ scope: "organization", organizationId: "org-123" })).toEqual(
            {
                scope: "organization",
                scopeId: "org-123",
            }
        )

        expect(createRequestScopeKey({ scope: "organization", organizationId: null })).toBeNull()
        expect(createRequestScopeKey({ scope: "organization" })).toBeNull()
    })

    it("creates a personal scope only from a real user id", () => {
        expect(createRequestScopeKey({ scope: "personal", userId: "user-123" })).toEqual({
            scope: "personal",
            scopeId: "user-123",
        })

        expect(createRequestScopeKey({ scope: "personal", userId: null })).toBeNull()
        expect(createRequestScopeKey({ scope: "personal" })).toBeNull()
    })
})

describe("createFirstRequestsListQueryParamsFromSearchParams", () => {
    const requestScope = { scope: "organization", scopeId: "org-123" } as const

    it("creates default first-page params when no request search params are present", () => {
        expect(
            createFirstRequestsListQueryParamsFromSearchParams(requestScope, new URLSearchParams())
        ).toEqual({
            ...requestScope,
            page: 1,
            limit: 10,
            search: "",
            lifecycleStatus: "invoiced,quoted,open,closed,draft",
            closedReason: "",
            assignedTo: "",
            priority: "",
            fromDate: "",
            toDate: "",
        })
    })

    it("creates filtered first-page params only when the URL explicitly requests page 1", () => {
        expect(
            createFirstRequestsListQueryParamsFromSearchParams(
                requestScope,
                new URLSearchParams("page=1&search=invoice&lifecycleStatus=quoted,open")
            )
        ).toEqual({
            ...requestScope,
            page: 1,
            limit: 10,
            search: "invoice",
            lifecycleStatus: "quoted,open",
            closedReason: "",
            assignedTo: "",
            priority: "",
            fromDate: "",
            toDate: "",
        })

        expect(
            createFirstRequestsListQueryParamsFromSearchParams(
                requestScope,
                new URLSearchParams("search=invoice&lifecycleStatus=quoted,open")
            )
        ).toBeNull()
    })

    it("does not create params for non-first pages or non-default page sizes", () => {
        expect(
            createFirstRequestsListQueryParamsFromSearchParams(
                requestScope,
                new URLSearchParams("page=2")
            )
        ).toBeNull()

        expect(
            createFirstRequestsListQueryParamsFromSearchParams(
                requestScope,
                new URLSearchParams("page=1&limit=20")
            )
        ).toBeNull()
    })
})

describe("fetchRequestsPage", () => {
    it("sends the personal scope contract to the requests endpoint", async () => {
        installFetch()

        await fetchRequestsPage({
            scope: "personal",
            scopeId: "user-123",
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

        const url = new URL(fetchUrls[0], "https://app.example.test")
        expect(url.pathname).toBe("/api/requests")
        expect(url.searchParams.get("scope")).toBe("personal")
        expect(url.searchParams.get("scopeId")).toBe("user-123")
    })

    it("returns personal request rows from the flat user requests API shape", async () => {
        installFetch(Response.json(flatPersonalRequestListPayload))

        const data = await fetchRequestsPage({
            scope: "personal",
            scopeId: "user-123",
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

        expect(data.requests).toHaveLength(1)
        expect(data.requests[0]?.reqNumber).toBe("QA-REQ-ATLAS-001")
        expect(data.requests[0]?.requester).toEqual({
            id: "user-123",
            name: "Ada Lovelace",
            email: "ada@example.com",
            image: null,
        })
        expect(data.requests[0]?.conversationId).toBeNull()
        expect(data.pagination).toEqual({
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
        })
    })

    it("falls back to the requested pagination params when the personal API omits them", async () => {
        installFetch(
            Response.json({
                data: {
                    ...flatPersonalRequestListPayload.data,
                    pagination: {
                        total: 8,
                    },
                },
            })
        )

        const data = await fetchRequestsPage({
            scope: "personal",
            scopeId: "user-123",
            page: 2,
            limit: 5,
            search: "",
            lifecycleStatus: "",
            closedReason: "",
            assignedTo: "",
            priority: "",
            fromDate: "",
            toDate: "",
        })

        const url = new URL(fetchUrls[0], "https://app.example.test")
        expect(url.searchParams.get("page")).toBe("2")
        expect(url.searchParams.get("limit")).toBe("5")
        expect(data.pagination).toEqual({
            total: 8,
            page: 2,
            limit: 5,
            totalPages: 2,
        })
    })

    it("sends the request search filter to the requests endpoint", async () => {
        installFetch()

        await fetchRequestsPage({
            scope: "personal",
            scopeId: "user-123",
            page: 1,
            limit: 10,
            search: "QA-REQ-ATLAS-003",
            lifecycleStatus: "",
            closedReason: "",
            assignedTo: "",
            priority: "",
            fromDate: "",
            toDate: "",
        })

        const url = new URL(fetchUrls[0], "https://app.example.test")
        expect(url.searchParams.get("search")).toBe("QA-REQ-ATLAS-003")
    })

    it("rejects invalid personal request shapes instead of returning an empty list", async () => {
        installFetch(
            Response.json({
                data: {
                    requests: [
                        {
                            id: "request-1",
                            reqNumber: "QA-REQ-ATLAS-001",
                            lifecycleStatus: "open",
                            closedReason: null,
                            categories: [],
                            services: [],
                            comments: null,
                            fromDate: "2026-05-11T00:00:00.000Z",
                            toDate: "2026-05-12T00:00:00.000Z",
                            createdAt: "2026-05-11T00:00:00.000Z",
                            updatedAt: "2026-05-11T00:00:00.000Z",
                            organization: {
                                id: "org-123",
                                name: "Ortelius Logistics",
                                slug: "ortelius-logistics",
                                logo: null,
                            },
                        },
                    ],
                    pagination: {
                        total: 1,
                    },
                },
            })
        )

        await expect(
            fetchRequestsPage({
                scope: "personal",
                scopeId: "user-123",
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
        ).rejects.toThrow()
    })

    it("sends the organization scope contract to the requests endpoint", async () => {
        installFetch()

        await fetchRequestsPage({
            scope: "organization",
            scopeId: "org-123",
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

        const url = new URL(fetchUrls[0], "https://app.example.test")
        expect(url.pathname).toBe("/api/requests")
        expect(url.searchParams.get("scope")).toBe("organization")
        expect(url.searchParams.get("scopeId")).toBe("org-123")
    })

    it("omits invalid request date filters from the requests endpoint", async () => {
        installFetch()

        await fetchRequestsPage({
            scope: "organization",
            scopeId: "org-123",
            page: 1,
            limit: 10,
            search: "",
            lifecycleStatus: "",
            closedReason: "",
            assignedTo: "",
            priority: "",
            fromDate: "not-a-date",
            toDate: "2026-05-12",
        })

        const url = new URL(fetchUrls[0], "https://app.example.test")
        expect(url.searchParams.has("fromDate")).toBe(false)
        expect(url.searchParams.has("toDate")).toBe(false)
    })

    it("omits reversed request end dates from the requests endpoint", async () => {
        installFetch()

        await fetchRequestsPage({
            scope: "organization",
            scopeId: "org-123",
            page: 1,
            limit: 10,
            search: "",
            lifecycleStatus: "",
            closedReason: "",
            assignedTo: "",
            priority: "",
            fromDate: "2026-05-12",
            toDate: "2026-05-11",
        })

        const url = new URL(fetchUrls[0], "https://app.example.test")
        expect(url.searchParams.get("fromDate")).toBe("2026-05-12")
        expect(url.searchParams.has("toDate")).toBe(false)
    })
})

describe("buildRequestByNumberEndpoint", () => {
    it("includes the request scope contract in the detail endpoint", () => {
        const endpoint = buildRequestByNumberEndpoint("REQ-001", {
            scope: "organization",
            scopeId: "org-123",
        })
        const url = new URL(endpoint, "https://app.example.test")

        expect(url.pathname).toBe("/api/requests/by-number/REQ-001")
        expect(url.searchParams.get("scope")).toBe("organization")
        expect(url.searchParams.get("scopeId")).toBe("org-123")
    })
})

describe("request sheet search params", () => {
    it("accepts backend request numbers without assuming a fixed prefix", () => {
        expect(parseOptionalSearchParam("REQ-001", requestNumberSearchSchema)).toBe("REQ-001")
        expect(parseOptionalSearchParam("QA-REQ-HELIX-001", requestNumberSearchSchema)).toBe(
            "QA-REQ-HELIX-001"
        )
        expect(parseOptionalSearchParam(" QA-REQ-HELIX-001 ", requestNumberSearchSchema)).toBe(
            "QA-REQ-HELIX-001"
        )
    })

    it("rejects empty, oversized, or unsafe request sheet numbers", () => {
        expect(parseOptionalSearchParam("", requestNumberSearchSchema)).toBeNull()
        expect(parseOptionalSearchParam("a".repeat(81), requestNumberSearchSchema)).toBeNull()
        expect(parseOptionalSearchParam("REQ-001<script>", requestNumberSearchSchema)).toBeNull()
    })

    it("accepts only explicit team-chat params", () => {
        expect(parseOptionalSearchParam("true", requestSheetFromTeamChatSearchSchema)).toBe("true")
        expect(parseOptionalSearchParam("false", requestSheetFromTeamChatSearchSchema)).toBeNull()
        expect(
            parseOptionalSearchParam("org-123", requestSheetTeamChatOrganizationIdSearchSchema)
        ).toBe("org-123")
        expect(
            parseOptionalSearchParam("", requestSheetTeamChatOrganizationIdSearchSchema)
        ).toBeNull()
    })
})
