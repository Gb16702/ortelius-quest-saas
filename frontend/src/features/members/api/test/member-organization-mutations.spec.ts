import { describe, expect, it } from "bun:test"
import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { createElement, type ReactNode } from "react"
import {
    type MembersQueryData,
    membersKeys,
    type OrganizationMember,
    organizationMemberSchema,
} from "@/entities/member"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { TEST_USER_EMAIL, TEST_USER_ID, TEST_USER_NAME } from "@/shared/test/fixtures/identity"
import { server } from "@/shared/test/msw/msw-server"
import { createTestQueryClient } from "@/shared/test/render/query-client.factory"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { useRemoveMember } from "../member-organization.mutations"

const ORG_ID = "organization-1"
const REMOVE_ENDPOINT_PATTERN = "/api/organizations/:orgId/members/:memberId"
const LIST_KEY = membersKeys.list(ORG_ID, { page: 1, limit: 20, search: "", role: "" })
const DIRECTORY_KEY = membersKeys.directory(ORG_ID)

interface RecordedRequest {
    method: string
    url: string
    body: unknown
}

function buildWrapper(client: ReturnType<typeof createTestQueryClient>) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return createElement(QueryClientProvider, { client }, children)
    }
}

interface MemberOverrides {
    id?: string
    role?: string
}

function buildMember(overrides: MemberOverrides = {}): OrganizationMember {
    return parseSchema(organizationMemberSchema, {
        id: overrides.id ?? "member-1",
        role: overrides.role ?? "member",
        createdAt: "2026-01-01T00:00:00.000Z",
        user: {
            id: TEST_USER_ID,
            name: TEST_USER_NAME,
            email: TEST_USER_EMAIL,
            image: null,
            twoFactorEnabled: false,
        },
    })
}

function seedMembersList(
    client: ReturnType<typeof createTestQueryClient>,
    members: OrganizationMember[]
): void {
    const data: MembersQueryData = {
        members,
        pagination: { total: members.length, page: 1, limit: 20, totalPages: 1 },
    }
    client.setQueryData(LIST_KEY, data)
}

function captureRemoveRequest(record: RecordedRequest[]) {
    return http.delete(REMOVE_ENDPOINT_PATTERN, async ({ request }) => {
        const text = await request.text().catch(() => "")
        record.push({
            method: request.method,
            url: request.url,
            body: text === "" ? null : text,
        })
        return HttpResponse.json({ success: true, message: "Member removed" })
    })
}

describe("useRemoveMember", () => {
    setupMswServer()

    it("sends a DELETE to the organization member endpoint with no body", async () => {
        const requests: RecordedRequest[] = []
        server.use(captureRemoveRequest(requests))

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useRemoveMember(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current.mutateAsync("member-7")

        expect(requests).toHaveLength(1)
        const [recorded] = requests
        expect(recorded?.method).toBe("DELETE")
        expect(recorded?.url).toBe(`http://localhost/api/organizations/${ORG_ID}/members/member-7`)
        expect(recorded?.body).toBeNull()
    })

    it("resolves with the parsed success payload on a 200 response", async () => {
        server.use(
            http.delete(REMOVE_ENDPOINT_PATTERN, () =>
                HttpResponse.json({ success: true, message: "Member removed" })
            )
        )

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useRemoveMember(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        const value = await result.current.mutateAsync("member-1")

        expect(value).toMatchObject({ success: true, message: "Member removed" })
    })

    it("rejects with the server message when the response is a 4xx error", async () => {
        server.use(
            http.delete(REMOVE_ENDPOINT_PATTERN, () =>
                HttpResponse.json({ message: "Cannot remove last admin" }, { status: 403 })
            )
        )

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useRemoveMember(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await expect(result.current.mutateAsync("member-1")).rejects.toThrow(
            "Cannot remove last admin"
        )
    })

    it("rejects with the fallback message when a 5xx omits a message", async () => {
        server.use(
            http.delete(REMOVE_ENDPOINT_PATTERN, () => new HttpResponse(null, { status: 500 }))
        )

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useRemoveMember(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await expect(result.current.mutateAsync("member-1")).rejects.toThrow(
            "Failed to remove member"
        )
    })

    it("optimistically removes the member and decrements pagination total", async () => {
        const release: { resolve: () => void } = { resolve: () => {} }
        server.use(
            http.delete(REMOVE_ENDPOINT_PATTERN, async () => {
                await new Promise<void>((resolve) => {
                    release.resolve = resolve
                })
                return HttpResponse.json({ success: true })
            })
        )

        const queryClient = createTestQueryClient()
        const memberA = buildMember({ id: "member-1" })
        const memberB = buildMember({ id: "member-2" })
        seedMembersList(queryClient, [memberA, memberB])

        const { result } = renderHook(() => useRemoveMember(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        const pending = result.current.mutateAsync("member-1")

        await waitFor(() => {
            const cached = queryClient.getQueryData<MembersQueryData>(LIST_KEY)
            expect(cached?.members.map((m) => m.id)).toEqual(["member-2"])
            expect(cached?.pagination?.total).toBe(1)
        })

        release.resolve()
        await pending
    })

    it("clamps pagination total at zero when the cached total is already empty", async () => {
        const release: { resolve: () => void } = { resolve: () => {} }
        server.use(
            http.delete(REMOVE_ENDPOINT_PATTERN, async () => {
                await new Promise<void>((resolve) => {
                    release.resolve = resolve
                })
                return HttpResponse.json({ success: true })
            })
        )

        const queryClient = createTestQueryClient()
        const memberA = buildMember({ id: "member-1" })
        queryClient.setQueryData<MembersQueryData>(LIST_KEY, {
            members: [memberA],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        })

        const { result } = renderHook(() => useRemoveMember(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        const pending = result.current.mutateAsync("member-1")

        await waitFor(() => {
            const cached = queryClient.getQueryData<MembersQueryData>(LIST_KEY)
            expect(cached?.pagination?.total).toBe(0)
        })

        release.resolve()
        await pending
    })

    it("rolls back the optimistic removal when the server rejects", async () => {
        server.use(
            http.delete(REMOVE_ENDPOINT_PATTERN, () =>
                HttpResponse.json({ message: "Nope" }, { status: 500 })
            )
        )

        const queryClient = createTestQueryClient()
        const memberA = buildMember({ id: "member-1" })
        const memberB = buildMember({ id: "member-2" })
        seedMembersList(queryClient, [memberA, memberB])

        const { result } = renderHook(() => useRemoveMember(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current.mutateAsync("member-1").catch(() => undefined)

        await waitFor(() => {
            const cached = queryClient.getQueryData<MembersQueryData>(LIST_KEY)
            expect(cached?.members.map((m) => m.id)).toEqual(["member-1", "member-2"])
            expect(cached?.pagination?.total).toBe(2)
        })
    })

    it("invalidates members lists and directory query keys after settlement", async () => {
        server.use(http.delete(REMOVE_ENDPOINT_PATTERN, () => HttpResponse.json({ success: true })))

        const queryClient = createTestQueryClient()
        seedMembersList(queryClient, [buildMember({ id: "member-1" })])
        queryClient.setQueryData(DIRECTORY_KEY, [buildMember({ id: "member-1" })])

        const { result } = renderHook(() => useRemoveMember(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current.mutateAsync("member-1")

        expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState(DIRECTORY_KEY)?.isInvalidated).toBe(true)
    })
})
