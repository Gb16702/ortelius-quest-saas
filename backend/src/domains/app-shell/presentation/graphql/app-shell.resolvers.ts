import { GraphQLError } from 'graphql'
import type { GraphQLContext } from '../../../../infrastructure/graphql/graphql.context'
import { recordGraphQLTiming } from '../../../../infrastructure/graphql/graphql.timing'
import type { AuthUser } from '../../../auth/application/auth-models'
import { type AuthApplicationService, authApplicationService } from '../../../auth/auth.application'
import type { UserOrganizationRecord } from '../../../organization/application/ports'
import type { OrganizationFont } from '../../../organization/domain'
import type { OrganizationApplicationService } from '../../../organization/organization.application'
import { organizationApplicationService } from '../../../organization/organization.application'

type AppShellOrganizationService = Pick<
  OrganizationApplicationService,
  'getBySlug' | 'listUserOrganizations'
>

type AppShellAuthService = Pick<AuthApplicationService, 'getUserOrganizationMembership'>

export type AppShellResolverDependencies = {
  authService?: AppShellAuthService
  organizationService?: AppShellOrganizationService
}

type WorkspaceRole = 'member' | 'admin' | 'owner'

type Viewer = Pick<AuthUser, 'id' | 'email' | 'name' | 'image'>

type ShellActiveOrganization = Pick<UserOrganizationRecord, 'id' | 'name' | 'slug' | 'logo'>

type ShellOrganization = {
  id: string
  name: string
  slug: string
  logo: string | null
  brandColor: string
  font: OrganizationFont
  currentUserRole: WorkspaceRole
}

const workspaceRoles = new Set<string>(['member', 'admin', 'owner'])

function isWorkspaceRole(role: string): role is WorkspaceRole {
  return workspaceRoles.has(role)
}

function createGraphQLError(message: string, code: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code },
  })
}

function requireAuthenticatedUser(context: GraphQLContext): AuthUser {
  if (!context.isAuthenticated || !context.user) {
    throw createGraphQLError('Authentication required', 'UNAUTHENTICATED')
  }

  return context.user
}

export function createAppShellResolvers(dependencies: AppShellResolverDependencies = {}) {
  const authService = dependencies.authService ?? authApplicationService
  const organizationService = dependencies.organizationService ?? organizationApplicationService

  return {
    Query: {
      viewer: async (
        _parent: unknown,
        _args: Record<string, never>,
        context: GraphQLContext
      ): Promise<Viewer | null> => {
        return await recordGraphQLTiming(context.serverTiming, 'graphql_viewer', async () => {
          if (!context.isAuthenticated || !context.user) {
            return null
          }

          return {
            id: context.user.id,
            email: context.user.email,
            name: context.user.name,
            image: context.user.image ?? null,
          }
        })
      },

      organizationBySlug: async (
        _parent: unknown,
        args: { slug: string },
        context: GraphQLContext
      ): Promise<ShellOrganization | null> => {
        const user = await recordGraphQLTiming(context.serverTiming, 'graphql_auth', async () =>
          requireAuthenticatedUser(context)
        )

        const organization = await recordGraphQLTiming(
          context.serverTiming,
          'graphql_org_lookup',
          async () => await organizationService.getBySlug(args.slug)
        )

        if (!organization) {
          throw createGraphQLError('Organization not found', 'NOT_FOUND')
        }

        const membership = await recordGraphQLTiming(
          context.serverTiming,
          'graphql_membership_lookup',
          async () => await authService.getUserOrganizationMembership(user.id, organization.id)
        )

        if (!membership || !isWorkspaceRole(membership.role)) {
          throw createGraphQLError('You are not a member of this organization', 'FORBIDDEN')
        }

        return {
          id: organization.id,
          name: organization.name,
          slug: organization.slug ?? args.slug,
          logo: organization.logo ?? null,
          brandColor: organization.brandColor ?? '#0103B8',
          font: organization.font,
          currentUserRole: membership.role,
        }
      },
    },

    Viewer: {
      activeOrganization: async (
        _viewer: Viewer,
        _args: Record<string, never>,
        context: GraphQLContext
      ): Promise<ShellActiveOrganization | null> => {
        const user = context.user

        if (!user) {
          return null
        }

        return await recordGraphQLTiming(
          context.serverTiming,
          'graphql_viewer_active_org',
          async () => {
            const organizations = await organizationService.listUserOrganizations(user.id)
            const activeOrganization = organizations[0]

            if (!activeOrganization) {
              return null
            }

            return {
              id: activeOrganization.id,
              name: activeOrganization.name,
              slug: activeOrganization.slug,
              logo: activeOrganization.logo,
            }
          }
        )
      },
    },
  }
}
