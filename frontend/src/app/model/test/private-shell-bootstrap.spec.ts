import { describe, expect, it } from "bun:test"
import { HttpResponse, http } from "msw"
import * as v from "valibot"
import type { TanstackRouterContext } from "@/app/model/router.context"
import { type Role, userRoleKeys } from "@/entities/access"
import { favoriteKeys } from "@/entities/favorite"
import { membersKeys, type OrganizationMember } from "@/entities/member"
import {
    organizationLayoutShowcaseKeys,
    organizationWorkspaceBootstrapKeys,
} from "@/entities/organization"
import type { User } from "@/entities/session"
import {
    type CurrentSessionData,
    currentSessionQueryKey,
    currentUserQueryKey,
} from "@/features/auth"
import { chatKeys, SIDEBAR_MEMBER_CONVERSATION_LIMIT } from "@/features/chat"
import {
    TEST_ORG_ID,
    TEST_ORG_NAME,
    TEST_ORG_SLUG,
    TEST_USER_EMAIL,
    TEST_USER_ID,
    TEST_USER_NAME,
} from "@/shared/test/fixtures/identity"
import { server } from "@/shared/test/msw/msw-server"
import { createTestQueryClient } from "@/shared/test/render/query-client.factory"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { readMeShellBootstrapSession, readOrgWorkspaceBootstrap } from "../private-shell-bootstrap"

type PublicEnv = TanstackRouterContext["publicEnv"]

const publicEnv: PublicEnv = {
    API_URL: "https://api.example.test",
    WS_URL: "wss://api.example.test",
    PORTAL_ACCOUNT_URL: "https://portal.example.test",
    UMAMI_URL: undefined,
    UMAMI_WEBSITE_ID: undefined,
    STRIPE_PUBLISHABLE_KEY: undefined,
    GMAPS_KEY: undefined,
    E2E_EXPOSE_PC: false,
}

const graphqlRequestSchema = v.looseObject({
    operationName: v.optional(v.string()),
    variables: v.optional(v.record(v.string(), v.unknown())),
})

function createContext(): TanstackRouterContext {
    return {
        queryClient: createTestQueryClient(),
        sessionData: null,
        user: null,
        activeOrganization: null,
        publicEnv,
        requestOrigin: "https://app.example.test",
    }
}

function viewerPayload() {
    return {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        name: TEST_USER_NAME,
        image: null,
    }
}

function sidebarMember(): OrganizationMember {
    return {
        id: "membership-member-1",
        role: "member",
        createdAt: "2026-05-01T00:00:00.000Z",
        lastSeenAt: "2026-05-27T10:00:00.000Z",
        user: {
            id: "member-1",
            name: "Member One",
            email: "member-1@example.test",
            image: null,
            twoFactorEnabled: false,
        },
    }
}

function useOrgSidebarBootstrapHandlers({ total = 1 }: { total?: number } = {}) {
    server.use(
        http.get("/api/app-shell/organizations/:organizationId/sidebar-bootstrap", () =>
            HttpResponse.json({
                success: true,
                data: {
                    members: {
                        members: [sidebarMember()],
                        total,
                        page: 1,
                        limit: 100,
                        totalPages: Math.ceil(total / 100),
                    },
                    favorites: {
                        favorites: [
                            {
                                id: "favorite-1",
                                entityType: "conversation",
                                entityId: "conversation-member-1",
                                organizationId: TEST_ORG_ID,
                                label: "Member One",
                                subtitle: "Conversation",
                                createdAt: "2026-05-27T10:00:00.000Z",
                                meta: { isTeamChat: false },
                            },
                        ],
                    },
                    conversations: {
                        conversations: [
                            {
                                id: "conversation-member-1",
                                name: "Member One",
                                conversationType: "member_dm",
                                isTeamChat: false,
                                organizationId: TEST_ORG_ID,
                                lastMessage: {
                                    id: "message-1",
                                    content: "Hello",
                                    senderId: "member-1",
                                    senderName: "Member One",
                                    createdAt: "2026-05-27T10:00:00.000Z",
                                    isUnread: true,
                                },
                                messageCount: 1,
                                participants: [],
                                updatedAt: "2026-05-27T10:00:00.000Z",
                                contextInfo: {
                                    type: "user",
                                    id: "member-1",
                                    name: "Member One",
                                    image: null,
                                    email: "member-1@example.test",
                                },
                                isPinned: false,
                                pinnedAt: null,
                            },
                        ],
                        pagination: {
                            total: 1,
                            limit: SIDEBAR_MEMBER_CONVERSATION_LIMIT,
                            offset: 0,
                            hasMore: false,
                        },
                    },
                },
            })
        )
    )
}

describe("private shell bootstrap", () => {
    setupMswServer()

    it("hydrates the me shell session from one GraphQL bootstrap request", async () => {
        const operations: string[] = []
        server.use(
            http.post("/api/graphql", async ({ request }) => {
                const body = v.parse(graphqlRequestSchema, await request.json())
                operations.push(body.operationName ?? "")

                return HttpResponse.json({
                    data: {
                        viewer: {
                            ...viewerPayload(),
                            activeOrganization: null,
                        },
                    },
                })
            })
        )

        const context = createContext()
        const session = await readMeShellBootstrapSession(context)

        expect(operations).toEqual(["MeShellBootstrap"])
        expect(session.user?.id).toBe(TEST_USER_ID)
        expect(session.activeOrganization).toBeNull()
        expect(session.sessionData?.session?.activeOrganizationId).toBeNull()
        expect(context.queryClient.getQueryData<User | null>(currentUserQueryKey)).toMatchObject({
            id: TEST_USER_ID,
            email: TEST_USER_EMAIL,
        })
        expect(
            context.queryClient.getQueryData<CurrentSessionData>(currentSessionQueryKey)
        ).toMatchObject({
            user: { id: TEST_USER_ID },
            activeOrganization: null,
        })
    })

    it("hydrates minimal active organization context for the me shell", async () => {
        server.use(
            http.post("/api/graphql", () =>
                HttpResponse.json({
                    data: {
                        viewer: {
                            ...viewerPayload(),
                            activeOrganization: {
                                id: TEST_ORG_ID,
                                name: TEST_ORG_NAME,
                                slug: TEST_ORG_SLUG,
                                logo: null,
                            },
                        },
                    },
                })
            )
        )

        const context = createContext()
        const session = await readMeShellBootstrapSession(context)

        expect(session.activeOrganization?.id).toBe(TEST_ORG_ID)
        expect(session.activeOrganization?.slug).toBe(TEST_ORG_SLUG)
        expect(session.sessionData?.session?.activeOrganizationId).toBe(TEST_ORG_ID)
    })

    it("treats unauthenticated me shell bootstrap errors as a missing session", async () => {
        server.use(
            http.post("/api/graphql", () =>
                HttpResponse.json(
                    {
                        errors: [
                            {
                                message: "Authentication required",
                                extensions: { code: "UNAUTHENTICATED" },
                            },
                        ],
                    },
                    { status: 401 }
                )
            )
        )

        const context = createContext()
        const session = await readMeShellBootstrapSession(context)

        expect(session.user).toBeNull()
        expect(session.sessionData).toBeNull()
        expect(
            context.queryClient.getQueryData<CurrentSessionData>(currentSessionQueryKey)
        ).toEqual({
            sessionData: null,
            user: null,
            activeOrganization: null,
        })
    })

    it("hydrates org workspace shell caches from one GraphQL bootstrap request", async () => {
        const operations: string[] = []
        const variables: unknown[] = []
        useOrgSidebarBootstrapHandlers({ total: 123 })
        server.use(
            http.post("/api/graphql", async ({ request }) => {
                const body = v.parse(graphqlRequestSchema, await request.json())
                operations.push(body.operationName ?? "")
                variables.push(body.variables)

                return HttpResponse.json({
                    data: {
                        viewer: viewerPayload(),
                        organizationBySlug: {
                            id: TEST_ORG_ID,
                            name: TEST_ORG_NAME,
                            slug: TEST_ORG_SLUG,
                            logo: null,
                            font: "manrope",
                            currentUserRole: "ADMIN",
                        },
                    },
                })
            })
        )

        const context = createContext()
        const result = await readOrgWorkspaceBootstrap(context, TEST_ORG_SLUG)

        expect(operations).toEqual(["OrgWorkspaceBootstrap"])
        expect(variables).toEqual([{ slug: TEST_ORG_SLUG }])
        expect(result.kind).toBe("ok")
        if (result.kind !== "ok") throw new Error("Expected ok bootstrap result")

        expect(result.currentUserRole).toBe("admin")
        expect(result.organization.memberCount).toBe(123)
        expect(result.sessionData.session?.activeOrganizationId).toBe(TEST_ORG_ID)
        expect(context.queryClient.getQueryData<User | null>(currentUserQueryKey)).toMatchObject({
            id: TEST_USER_ID,
        })
        expect(
            context.queryClient.getQueryData(organizationLayoutShowcaseKeys.detail(TEST_ORG_SLUG))
        ).toMatchObject({
            id: TEST_ORG_ID,
            name: TEST_ORG_NAME,
            slug: TEST_ORG_SLUG,
            font: "manrope",
            memberCount: 123,
        })
        expect(context.queryClient.getQueryData<Role>(userRoleKeys.detail(TEST_ORG_ID))).toBe(
            "admin"
        )
        expect(
            context.queryClient.getQueryData<Role>(
                userRoleKeys.current({
                    organizationId: TEST_ORG_ID,
                    userId: TEST_USER_ID,
                })
            )
        ).toBe("admin")
        expect(
            context.queryClient.getQueryData<OrganizationMember[]>(
                membersKeys.directory(TEST_ORG_ID)
            )
        ).toMatchObject([{ user: { id: "member-1" } }])
        expect(
            context.queryClient.getQueryData(favoriteKeys.list({ organizationId: TEST_ORG_ID }))
        ).toMatchObject({
            favorites: [{ entityId: "conversation-member-1" }],
        })
        expect(
            context.queryClient.getQueryData(
                chatKeys.conversationsFeed({
                    userId: TEST_USER_ID,
                    scope: `${TEST_ORG_ID}:sidebar-members`,
                    filter: "all",
                    typeFilter: "member_dm",
                    sort: "newest",
                    searchQuery: "",
                    limit: SIDEBAR_MEMBER_CONVERSATION_LIMIT,
                })
            )
        ).toMatchObject({
            conversations: [{ id: "conversation-member-1", conversationType: "member_dm" }],
        })
    })

    it("refetches org workspace bootstrap data after targeted invalidation", async () => {
        const operations: string[] = []
        let font = "inter"
        useOrgSidebarBootstrapHandlers()
        server.use(
            http.post("/api/graphql", async ({ request }) => {
                const body = v.parse(graphqlRequestSchema, await request.json())
                operations.push(body.operationName ?? "")

                return HttpResponse.json({
                    data: {
                        viewer: viewerPayload(),
                        organizationBySlug: {
                            id: TEST_ORG_ID,
                            name: TEST_ORG_NAME,
                            slug: TEST_ORG_SLUG,
                            logo: null,
                            font,
                            currentUserRole: "ADMIN",
                        },
                    },
                })
            })
        )

        const context = createContext()
        const firstResult = await readOrgWorkspaceBootstrap(context, TEST_ORG_SLUG)
        font = "manrope"
        await context.queryClient.invalidateQueries({
            queryKey: organizationWorkspaceBootstrapKeys.detail(TEST_ORG_SLUG),
            refetchType: "none",
        })
        const secondResult = await readOrgWorkspaceBootstrap(context, TEST_ORG_SLUG)

        expect(operations).toEqual(["OrgWorkspaceBootstrap", "OrgWorkspaceBootstrap"])
        expect(firstResult.kind).toBe("ok")
        expect(secondResult.kind).toBe("ok")
        if (firstResult.kind !== "ok" || secondResult.kind !== "ok") {
            throw new Error("Expected ok bootstrap results")
        }
        expect(firstResult.organization.font).toBe("inter")
        expect(secondResult.organization.font).toBe("manrope")
    })

    it("reuses the sidebar bootstrap cache across fast org navigations", async () => {
        const operations: string[] = []
        let sidebarBootstrapCalls = 0
        server.use(
            http.post("/api/graphql", async ({ request }) => {
                const body = v.parse(graphqlRequestSchema, await request.json())
                operations.push(body.operationName ?? "")

                return HttpResponse.json({
                    data: {
                        viewer: viewerPayload(),
                        organizationBySlug: {
                            id: TEST_ORG_ID,
                            name: TEST_ORG_NAME,
                            slug: TEST_ORG_SLUG,
                            logo: null,
                            font: "manrope",
                            currentUserRole: "ADMIN",
                        },
                    },
                })
            }),
            http.get("/api/app-shell/organizations/:organizationId/sidebar-bootstrap", () => {
                sidebarBootstrapCalls += 1
                return HttpResponse.json({
                    success: true,
                    data: {
                        members: {
                            members: [sidebarMember()],
                            total: 1,
                            page: 1,
                            limit: 100,
                            totalPages: 1,
                        },
                        favorites: { favorites: [] },
                        conversations: {
                            conversations: [],
                            pagination: {
                                total: 0,
                                limit: SIDEBAR_MEMBER_CONVERSATION_LIMIT,
                                offset: 0,
                                hasMore: false,
                            },
                        },
                    },
                })
            })
        )

        const context = createContext()
        await readOrgWorkspaceBootstrap(context, TEST_ORG_SLUG)
        await readOrgWorkspaceBootstrap(context, TEST_ORG_SLUG)

        expect(operations).toEqual(["OrgWorkspaceBootstrap"])
        expect(sidebarBootstrapCalls).toBe(1)
    })

    it("does not overwrite optimistic favorite cache with cached sidebar bootstrap data", async () => {
        useOrgSidebarBootstrapHandlers()
        server.use(
            http.post("/api/graphql", () =>
                HttpResponse.json({
                    data: {
                        viewer: viewerPayload(),
                        organizationBySlug: {
                            id: TEST_ORG_ID,
                            name: TEST_ORG_NAME,
                            slug: TEST_ORG_SLUG,
                            logo: null,
                            font: "manrope",
                            currentUserRole: "ADMIN",
                        },
                    },
                })
            )
        )

        const context = createContext()
        await readOrgWorkspaceBootstrap(context, TEST_ORG_SLUG)

        context.queryClient.setQueryData(favoriteKeys.list({ organizationId: TEST_ORG_ID }), {
            favorites: [
                {
                    id: "favorite-member-1",
                    entityType: "member",
                    entityId: "member-1",
                    organizationId: TEST_ORG_ID,
                    label: "Member One",
                    subtitle: "Member profile",
                    createdAt: "2026-05-28T10:00:00.000Z",
                    meta: { name: "Member One", image: null },
                },
            ],
        })

        await readOrgWorkspaceBootstrap(context, TEST_ORG_SLUG)

        expect(
            context.queryClient.getQueryData(favoriteKeys.list({ organizationId: TEST_ORG_ID }))
        ).toMatchObject({
            favorites: [{ entityType: "member", entityId: "member-1" }],
        })
    })

    it("returns forbidden when the org workspace bootstrap has no current user role", async () => {
        server.use(
            http.post("/api/graphql", () =>
                HttpResponse.json({
                    data: {
                        viewer: viewerPayload(),
                        organizationBySlug: {
                            id: TEST_ORG_ID,
                            name: TEST_ORG_NAME,
                            slug: TEST_ORG_SLUG,
                            logo: null,
                            currentUserRole: null,
                        },
                    },
                })
            )
        )

        const result = await readOrgWorkspaceBootstrap(createContext(), TEST_ORG_SLUG)

        expect(result).toEqual({ kind: "forbidden" })
    })

    it("returns not-found when the org workspace bootstrap cannot resolve the slug", async () => {
        server.use(
            http.post("/api/graphql", () =>
                HttpResponse.json({
                    data: {
                        viewer: viewerPayload(),
                        organizationBySlug: null,
                    },
                })
            )
        )

        const result = await readOrgWorkspaceBootstrap(createContext(), "missing-org")

        expect(result).toEqual({ kind: "not-found" })
    })
})
