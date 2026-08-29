import { describe, expect, it } from "bun:test"
import { QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { createElement, type ReactNode } from "react"
import { type Invitation, type InvitationsQueryData, invitationsKeys } from "@/entities/invitation"
import { server } from "@/shared/test/msw/msw-server"
import { createTestQueryClient } from "@/shared/test/render/query-client.factory"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { useUpdateInvitationRole } from "../member-invitation-role.mutations"

const ORG_ID = "organization-1"
const ROLE_ENDPOINT_PATTERN = "/api/organizations/invitation/:invitationId/role"
const INVITATION_LIST_KEY = invitationsKeys.list(ORG_ID, {
    page: 1,
    limit: 20,
    search: "",
    role: "",
    status: "",
})

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

function createInvitation(overrides: Partial<Invitation> = {}): Invitation {
    return {
        id: "invitation-1",
        organizationId: ORG_ID,
        email: "guest@example.test",
        role: "member",
        status: "pending",
        expiresAt: "2026-12-31T00:00:00.000Z",
        inviterName: "Ada Lovelace",
        inviterId: "user-1",
        canceledAt: null,
        archivedAt: null,
        lastSentAt: null,
        archived: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    }
}

function seedInvitationsList(
    client: ReturnType<typeof createTestQueryClient>,
    invitations: Invitation[]
): void {
    const data: InvitationsQueryData = {
        invitations,
        pagination: { total: invitations.length, page: 1, limit: 20, totalPages: 1 },
    }
    client.setQueryData(INVITATION_LIST_KEY, data)
}

function captureRoleRequest(record: RecordedRequest[]) {
    return http.patch(ROLE_ENDPOINT_PATTERN, async ({ request }) => {
        record.push({
            method: request.method,
            url: request.url,
            body: await request.json().catch(() => null),
        })
        return HttpResponse.json({ success: true, message: "Invitation role updated" })
    })
}

describe("useUpdateInvitationRole", () => {
    setupMswServer()

    it("sends a PATCH with role body to the invitation role endpoint", async () => {
        const requests: RecordedRequest[] = []
        server.use(captureRoleRequest(requests))

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useUpdateInvitationRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current.mutateAsync({
            invitationId: "invitation-9",
            role: "manager",
        })

        expect(requests).toHaveLength(1)
        const [recorded] = requests
        expect(recorded?.method).toBe("PATCH")
        expect(recorded?.url).toBe(
            "http://localhost/api/organizations/invitation/invitation-9/role"
        )
        expect(recorded?.body).toEqual({ role: "manager" })
    })

    it("resolves with the parsed success payload on a 200 response", async () => {
        server.use(
            http.patch(ROLE_ENDPOINT_PATTERN, () =>
                HttpResponse.json({ success: true, message: "Invitation role updated" })
            )
        )

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useUpdateInvitationRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        const value = await result.current.mutateAsync({
            invitationId: "invitation-1",
            role: "admin",
        })

        expect(value).toMatchObject({ success: true, message: "Invitation role updated" })
    })

    it("rejects with the server message when the response is a 4xx error", async () => {
        server.use(
            http.patch(ROLE_ENDPOINT_PATTERN, () =>
                HttpResponse.json({ message: "Invalid role" }, { status: 422 })
            )
        )

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useUpdateInvitationRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await expect(
            result.current.mutateAsync({ invitationId: "invitation-1", role: "admin" })
        ).rejects.toThrow("Invalid role")
    })

    it("rejects with the fallback message when the server omits a message body", async () => {
        server.use(http.patch(ROLE_ENDPOINT_PATTERN, () => new HttpResponse(null, { status: 500 })))

        const queryClient = createTestQueryClient()
        const { result } = renderHook(() => useUpdateInvitationRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await expect(
            result.current.mutateAsync({ invitationId: "invitation-1", role: "admin" })
        ).rejects.toThrow("Failed to update invitation role")
    })

    it("optimistically updates the cached invitation role before the request resolves", async () => {
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
        const invitationA = createInvitation({ id: "invitation-1", role: "member" })
        const invitationB = createInvitation({ id: "invitation-2", role: "member" })
        seedInvitationsList(queryClient, [invitationA, invitationB])

        const { result } = renderHook(() => useUpdateInvitationRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        const pending = result.current.mutateAsync({
            invitationId: "invitation-1",
            role: "admin",
        })

        await waitFor(() => {
            const cached = queryClient.getQueryData<InvitationsQueryData>(INVITATION_LIST_KEY)
            expect(cached?.invitations.find((i) => i.id === "invitation-1")?.role).toBe("admin")
            expect(cached?.invitations.find((i) => i.id === "invitation-2")?.role).toBe("member")
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
        const invitationA = createInvitation({ id: "invitation-1", role: "member" })
        seedInvitationsList(queryClient, [invitationA])

        const { result } = renderHook(() => useUpdateInvitationRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current
            .mutateAsync({ invitationId: "invitation-1", role: "admin" })
            .catch(() => undefined)

        await waitFor(() => {
            const cached = queryClient.getQueryData<InvitationsQueryData>(INVITATION_LIST_KEY)
            expect(cached?.invitations[0]?.role).toBe("member")
        })
    })

    it("invalidates the invitation lists query key after settlement", async () => {
        server.use(http.patch(ROLE_ENDPOINT_PATTERN, () => HttpResponse.json({ success: true })))

        const queryClient = createTestQueryClient()
        seedInvitationsList(queryClient, [createInvitation({ id: "invitation-1", role: "member" })])

        const { result } = renderHook(() => useUpdateInvitationRole(ORG_ID), {
            wrapper: buildWrapper(queryClient),
        })

        await result.current.mutateAsync({
            invitationId: "invitation-1",
            role: "admin",
        })

        expect(queryClient.getQueryState(INVITATION_LIST_KEY)?.isInvalidated).toBe(true)
    })
})
