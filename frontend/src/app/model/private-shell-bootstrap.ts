import { queryOptions } from "@tanstack/react-query"
import * as v from "valibot"
import type { TanstackRouterContext } from "@/app/model/router.context"
import { type Role, RoleSchema, userRoleKeys } from "@/entities/access"
import {
    favoriteGroupSchema,
    favoriteItemSchema,
    favoritesQueryOptions,
    mergeFavoritesConversationDisplayMetadata,
} from "@/entities/favorite"
import { organizationMemberSchema, organizationMembersQueryOptions } from "@/entities/member"
import {
    normalizeOrganizationBrandColor,
    normalizeOrganizationFont,
    type OrganizationLayoutInfo,
    organizationLayoutShowcaseKeys,
    organizationWorkspaceBootstrapKeys,
} from "@/entities/organization"
import {
    type ActiveOrganization,
    activeOrganizationSchema,
    type SessionResponse,
    type User,
    userSchema,
} from "@/entities/session"
import {
    type CurrentSessionData,
    currentSessionQueryKey,
    currentUserQueryKey,
} from "@/features/auth"
import { conversationSchema, orgSidebarMemberConversationsQueryOptions } from "@/features/chat"
import { graphqlQueryData } from "@/shared/api/graphql"
import { ApiError, createApiError, readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

const PRIVATE_SHELL_BOOTSTRAP_STALE_TIME_MS = 30_000

const ME_SHELL_BOOTSTRAP_QUERY = `
  query MeShellBootstrap {
    viewer {
      id
      email
      name
      image
      activeOrganization {
        id
        name
        slug
        logo
      }
    }
  }
`

const ORG_WORKSPACE_BOOTSTRAP_QUERY = `
  query OrgWorkspaceBootstrap($slug: String!) {
    viewer {
      id
      email
      name
      image
    }

    organizationBySlug(slug: $slug) {
      id
      name
      slug
      logo
      brandColor
      font
      currentUserRole
    }
  }
`

const nullableStringSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => value ?? null)
)

const viewerIdentitySchema = v.looseObject({
    id: v.string(),
    email: v.optional(v.string(), ""),
    name: v.optional(v.string(), ""),
    image: nullableStringSchema,
})

const meShellViewerSchema = v.object({
    .../*@valibot-migrate we can't detect if viewerIdentitySchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
    viewerIdentitySchema.entries,

    activeOrganization: v.optional(v.nullable(activeOrganizationSchema)),
})

const normalizedRoleSchema = v.pipe(
    v.unknown(),
    v.transform((value) => (typeof value === "string" ? value.toLowerCase() : value)),
    v.nullable(RoleSchema)
)

const orgWorkspaceOrganizationSchema = v.pipe(
    v.looseObject({
        id: v.string(),
        name: v.string(),
        slug: v.string(),
        logo: nullableStringSchema,
        brandColor: v.optional(v.unknown()),
        font: v.optional(v.unknown()),
        currentUserRole: normalizedRoleSchema,
    }),
    v.transform((organization) => ({
        ...organization,
        brandColor: normalizeOrganizationBrandColor(organization.brandColor),
        font: normalizeOrganizationFont(organization.font),
    }))
)

const meShellBootstrapDataSchema = v.object({
    viewer: v.nullable(meShellViewerSchema),
})

const orgWorkspaceBootstrapDataSchema = v.object({
    viewer: v.nullable(viewerIdentitySchema),
    organizationBySlug: v.nullable(orgWorkspaceOrganizationSchema),
})

const orgSidebarBootstrapDataSchema = v.object({
    members: v.looseObject({
        members: v.array(organizationMemberSchema),
        total: v.number(),
        page: v.number(),
        limit: v.number(),
        totalPages: v.number(),
    }),
    favorites: v.object({
        favorites: v.array(favoriteItemSchema),
        groups: v.optional(v.array(favoriteGroupSchema), []),
    }),
    conversations: v.object({
        conversations: v.array(conversationSchema),
        pagination: v.object({
            total: v.number(),
            limit: v.number(),
            offset: v.number(),
            hasMore: v.boolean(),
        }),
    }),
})

const orgSidebarBootstrapResponseSchema = v.object({
    success: v.optional(v.boolean()),
    data: orgSidebarBootstrapDataSchema,
})

type ViewerIdentity = v.InferOutput<typeof viewerIdentitySchema>
type MeShellBootstrapData = v.InferOutput<typeof meShellBootstrapDataSchema>
type OrgWorkspaceBootstrapData = v.InferOutput<typeof orgWorkspaceBootstrapDataSchema>
type OrgSidebarBootstrapData = v.InferOutput<typeof orgSidebarBootstrapDataSchema>
type OrgWorkspaceBootstrapOrganization = NonNullable<
    OrgWorkspaceBootstrapData["organizationBySlug"]
>

export type OrgWorkspaceBootstrapResult =
    | {
          kind: "ok"
          sessionData: SessionResponse
          user: User
          activeOrganization: ActiveOrganization
          organization: OrganizationLayoutInfo
          currentUserRole: Role
      }
    | {
          kind: "unauthenticated" | "forbidden" | "not-found"
      }

const privateShellBootstrapKeys = {
    me: ["private-shell-bootstrap", "me"] as const,
    orgWorkspace: organizationWorkspaceBootstrapKeys.detail,
    orgSidebar: (organizationId: string) =>
        ["private-shell-bootstrap", "org-sidebar", organizationId] as const,
}

function meShellBootstrapQueryOptions() {
    return queryOptions({
        queryKey: privateShellBootstrapKeys.me,
        queryFn: fetchMeShellBootstrap,
        staleTime: PRIVATE_SHELL_BOOTSTRAP_STALE_TIME_MS,
    })
}

function orgWorkspaceBootstrapQueryOptions(slug: string) {
    return queryOptions({
        queryKey: privateShellBootstrapKeys.orgWorkspace(slug),
        queryFn: () => fetchOrgWorkspaceBootstrap(slug),
        staleTime: PRIVATE_SHELL_BOOTSTRAP_STALE_TIME_MS,
    })
}

function orgSidebarBootstrapQueryOptions(organizationId: string) {
    return queryOptions({
        queryKey: privateShellBootstrapKeys.orgSidebar(organizationId),
        queryFn: () => fetchOrgSidebarBootstrap(organizationId),
        staleTime: PRIVATE_SHELL_BOOTSTRAP_STALE_TIME_MS,
    })
}

async function fetchMeShellBootstrap(): Promise<MeShellBootstrapData> {
    return graphqlQueryData(
        {
            query: ME_SHELL_BOOTSTRAP_QUERY,
            operationName: "MeShellBootstrap",
        },
        meShellBootstrapDataSchema
    )
}

async function fetchOrgWorkspaceBootstrap(slug: string): Promise<OrgWorkspaceBootstrapData> {
    return graphqlQueryData(
        {
            query: ORG_WORKSPACE_BOOTSTRAP_QUERY,
            operationName: "OrgWorkspaceBootstrap",
            variables: { slug },
        },
        orgWorkspaceBootstrapDataSchema
    )
}

async function fetchOrgSidebarBootstrap(organizationId: string): Promise<OrgSidebarBootstrapData> {
    const response = await fetch(
        `/api/app-shell/organizations/${encodeURIComponent(organizationId)}/sidebar-bootstrap`,
        { credentials: "include" }
    )
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw createApiError(response.status, payload, "Failed to load sidebar bootstrap")
    }

    return parseSchema(orgSidebarBootstrapResponseSchema, payload).data
}

export async function readMeShellBootstrapSession(
    context: TanstackRouterContext
): Promise<CurrentSessionData> {
    try {
        const data = await context.queryClient.ensureQueryData(meShellBootstrapQueryOptions())
        const viewer = data.viewer
        if (!viewer) return seedCurrentSession(context, null, null)

        const user = createUserFromViewer(viewer)
        return seedCurrentSession(context, user, viewer.activeOrganization ?? null)
    } catch (error) {
        if (classifyBootstrapError(error) === "unauthenticated") {
            return seedCurrentSession(context, null, null)
        }

        throw error
    }
}

export async function readOrgWorkspaceBootstrap(
    context: TanstackRouterContext,
    slug: string
): Promise<OrgWorkspaceBootstrapResult> {
    try {
        const data = await context.queryClient.fetchQuery(orgWorkspaceBootstrapQueryOptions(slug))

        if (!data.viewer) return { kind: "unauthenticated" }
        if (!data.organizationBySlug) return { kind: "not-found" }
        if (!data.organizationBySlug.currentUserRole) return { kind: "forbidden" }

        const user = createUserFromViewer(data.viewer)
        const organization = createOrganizationLayoutInfo(data.organizationBySlug)
        const activeOrganization = createActiveOrganization(organization)
        const sessionData = createSessionData(user, activeOrganization)

        seedCurrentSession(context, user, activeOrganization)
        const memberCount = await seedOrgSidebarQueries(context, {
            userId: user.id,
            organizationId: organization.id,
        })
        const hydratedOrganization = {
            ...organization,
            memberCount,
        }
        seedOrgWorkspaceQueries(context, {
            slug,
            userId: user.id,
            organization: hydratedOrganization,
            role: data.organizationBySlug.currentUserRole,
        })

        return {
            kind: "ok",
            sessionData,
            user,
            activeOrganization,
            organization: hydratedOrganization,
            currentUserRole: data.organizationBySlug.currentUserRole,
        }
    } catch (error) {
        const failure = classifyBootstrapError(error)
        if (failure) return { kind: failure }

        throw error
    }
}

async function seedOrgSidebarQueries(
    context: TanstackRouterContext,
    {
        userId,
        organizationId,
    }: {
        userId: string
        organizationId: string
    }
): Promise<number | null> {
    try {
        const bootstrap = await context.queryClient.fetchQuery(
            orgSidebarBootstrapQueryOptions(organizationId)
        )
        context.queryClient.setQueryData(
            organizationMembersQueryOptions(organizationId).queryKey,
            bootstrap.members.members
        )
        context.queryClient.setQueryData(
            favoritesQueryOptions(organizationId).queryKey,
            (current) =>
                current ?? {
                    favorites: mergeFavoritesConversationDisplayMetadata(
                        bootstrap.favorites.favorites
                    ),
                    groups: bootstrap.favorites.groups,
                }
        )
        context.queryClient.setQueryData(
            orgSidebarMemberConversationsQueryOptions({ userId, organizationId }).queryKey,
            {
                conversations: bootstrap.conversations.conversations,
                hasMore: bootstrap.conversations.pagination.hasMore,
            }
        )
        return bootstrap.members.total
    } catch {
        // Keep org navigation resilient while the backend and frontend roll out independently.
    }

    await Promise.allSettled([
        context.queryClient.ensureQueryData(organizationMembersQueryOptions(organizationId)),
        context.queryClient.ensureQueryData(favoritesQueryOptions(organizationId)),
        context.queryClient.ensureQueryData(
            orgSidebarMemberConversationsQueryOptions({ userId, organizationId })
        ),
    ])

    return null
}

function createUserFromViewer(viewer: ViewerIdentity): User {
    return parseSchema(userSchema, {
        id: viewer.id,
        email: viewer.email,
        name: viewer.name,
        image: viewer.image,
    })
}

function createSessionData(
    user: User,
    activeOrganization: ActiveOrganization | null
): SessionResponse {
    return {
        user,
        session: {
            activeOrganizationId: activeOrganization?.id ?? null,
        },
        accessToken: null,
    }
}

function seedCurrentSession(
    context: TanstackRouterContext,
    user: User | null,
    activeOrganization: ActiveOrganization | null
): CurrentSessionData {
    const sessionData = user ? createSessionData(user, activeOrganization) : null
    const currentSession: CurrentSessionData = {
        sessionData,
        user,
        activeOrganization,
    }

    context.queryClient.setQueryData(currentUserQueryKey, user)
    context.queryClient.setQueryData(currentSessionQueryKey, currentSession)

    return currentSession
}

function createOrganizationLayoutInfo(
    organization: OrgWorkspaceBootstrapOrganization
): OrganizationLayoutInfo {
    return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo ?? null,
        brandColor: organization.brandColor,
        font: organization.font,
        tagline: null,
        memberCount: null,
    }
}

function createActiveOrganization(organization: OrganizationLayoutInfo): ActiveOrganization {
    return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        brandLogo: organization.logo,
        tagline: organization.tagline,
        brandColor: organization.brandColor,
    }
}

function seedOrgWorkspaceQueries(
    context: TanstackRouterContext,
    {
        slug,
        userId,
        organization,
        role,
    }: {
        slug: string
        userId: string
        organization: OrganizationLayoutInfo
        role: Role
    }
): void {
    context.queryClient.setQueryData(organizationLayoutShowcaseKeys.detail(slug), organization)
    context.queryClient.setQueryData(userRoleKeys.detail(organization.id), role)
    context.queryClient.setQueryData(
        userRoleKeys.current({
            organizationId: organization.id,
            userId,
        }),
        role
    )
}

function classifyBootstrapError(
    error: unknown
): "unauthenticated" | "forbidden" | "not-found" | null {
    if (!(error instanceof ApiError)) return null

    if (error.status === 401 || error.code === "UNAUTHORIZED") return "unauthenticated"
    if (error.status === 403 || error.code === "FORBIDDEN") return "forbidden"
    if (error.status === 404 || error.code === "NOT_FOUND") return "not-found"

    return null
}
