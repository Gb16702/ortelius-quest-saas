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
import { useUpdateMemberRole } from "../member-role.mutations"

const ORG_ID = "organization-1"
const ROLE_ENDPOINT_PATTERN = "/api/organizations/:orgId/members/:memberId/role"
const LIST_PARAMS = { page: 1, limit: 20, search: "", role: "" }
const LIST_KEY = membersKeys.list(ORG_ID, LIST_PARAMS)
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

function captureRoleRequest(record: RecordedRequest[]) {
    return http.patch(ROLE_ENDPOINT_PATTERN, async ({ request }) => {
        record.push({
            method: request.method,
            url: request.url,
            body: await request.json().catch(() => null),
        })
        return HttpResponse.json({ success: true, message: "Member role updated" })
    })
}

describe("useUpdateMemberRole", () => {
    setupMswServer()

    it("sends a PATCH with role body to the member role endpoint", async () => {
        const requests: RecordedRequest[] = []
        server.use(captureRoleRequest(requests))

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useUpdateMemberRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current.mutateAsync({ memberId: "member-7", role: "admin" })

        expect(requests).toHaveLength(1)
        const [recorded] = requests
        expect(recorded?.method).toBe("PATCH")
        expect(recorded?.url).toBe(
            `http://localhost/api/organizations/${ORG_ID}/members/member-7/role`
        )
        expect(recorded?.body).toEqual({ role: "admin" })
    })

    it("resolves with the parsed success payload on a 200 response", async () => {
        server.use(
            http.patch(ROLE_ENDPOINT_PATTERN, () =>
                HttpResponse.json({ success: true, message: "Member role updated" })
            )
        )

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useUpdateMemberRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        const value = await result.current.mutateAsync({
            memberId: "member-1",
            role: "manager",
        })

        expect(value).toMatchObject({ success: true, message: "Member role updated" })
    })

    it("rejects with the server message when the response is a 4xx error", async () => {
        server.use(
            http.patch(ROLE_ENDPOINT_PATTERN, () =>
                HttpResponse.json({ message: "Role conflict" }, { status: 409 })
            )
        )

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useUpdateMemberRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await expect(
            result.current.mutateAsync({ memberId: "member-1", role: "admin" })
        ).rejects.toThrow("Role conflict")
    })

    it("rejects with the fallback message when a 5xx omits a message", async () => {
        server.use(http.patch(ROLE_ENDPOINT_PATTERN, () => new HttpResponse(null, { status: 500 })))

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useUpdateMemberRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await expect(
            result.current.mutateAsync({ memberId: "member-1", role: "admin" })
        ).rejects.toThrow("Failed to update member role")
    })

    it("optimistically updates the cached member role before the request resolves", async () => {
        const release: { resolve: () => void } = { resolve: () => {} }
        server.use(
            http.patch(ROLE_ENDPOINT_PATTERN, async () => {
                await new Promise<void>((resolve) => {
                    release.resolve = resolve
                })
                return HttpResponse.json({ success: true })
            })
        )

        const queryClient = createTestQueryClient()
        const memberA = buildMember({ id: "member-1", role: "member" })
        const memberB = buildMember({ id: "member-2", role: "member" })
        seedMembersList(queryClient, [memberA, memberB])

        const { result } = renderHook(() => useUpdateMemberRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        const pending = result.current.mutateAsync({ memberId: "member-1", role: "admin" })

        await waitFor(() => {
            const cached = queryClient.getQueryData<MembersQueryData>(LIST_KEY)
            expect(cached?.members.find((m) => m.id === "member-1")?.role).toBe("admin")
            expect(cached?.members.find((m) => m.id === "member-2")?.role).toBe("member")
        })

        release.resolve()
        await pending
    })

    it("rolls back the optimistic update when the server rejects", async () => {
        server.use(
            http.patch(ROLE_ENDPOINT_PATTERN, () =>
                HttpResponse.json({ message: "Nope" }, { status: 500 })
            )
        )

        const queryClient = createTestQueryClient()
        const memberA = buildMember({ id: "member-1", role: "member" })
        seedMembersList(queryClient, [memberA])

        const { result } = renderHook(() => useUpdateMemberRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current
            .mutateAsync({ memberId: "member-1", role: "admin" })
            .catch(() => undefined)

        await waitFor(() => {
            const cached = queryClient.getQueryData<MembersQueryData>(LIST_KEY)
            expect(cached?.members[0]?.role).toBe("member")
        })
    })

    it("invalidates members lists and directory query keys after settlement", async () => {
        server.use(http.patch(ROLE_ENDPOINT_PATTERN, () => HttpResponse.json({ success: true })))

        const queryClient = createTestQueryClient()
        seedMembersList(queryClient, [buildMember({ id: "member-1", role: "member" })])
        queryClient.setQueryData(DIRECTORY_KEY, [buildMember({ id: "member-1", role: "member" })])

        const { result } = renderHook(() => useUpdateMemberRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current.mutateAsync({ memberId: "member-1", role: "admin" })

        expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState(DIRECTORY_KEY)?.isInvalidated).toBe(true)
    })
})
