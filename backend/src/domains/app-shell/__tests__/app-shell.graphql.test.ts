import { describe, expect, mock, test } from 'bun:test'
import type { GraphQLServerContext } from '../../../infrastructure/graphql/graphql.context'
import { createGraphQLServer } from '../../../infrastructure/graphql/graphql.server'
import { createGraphQLServerTiming } from '../../../infrastructure/graphql/graphql.timing'
import type { AuthMembership } from '../../auth/application/auth-models'
import type { UserOrganizationRecord } from '../../organization/application/ports'
import { DEFAULT_ORGANIZATION_FONT, type OrganizationProfile } from '../../organization/domain'
import type { AppShellResolverDependencies } from '../presentation/graphql/app-shell.resolvers'

const meShellBootstrapQuery = /* GraphQL */ `
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

const orgWorkspaceBootstrapQuery = /* GraphQL */ `
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

type GraphQLResponse = {
  data?: Record<string, unknown>
  errors?: Array<{
    message: string
    extensions?: {
      code?: string
    }
  }>
}

const viewer = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  image: 'https://cdn.test/ada.png',
  role: 'member',
}

const organization: OrganizationProfile = {
  id: 'org-1',
  name: 'Quest Logistics',
  slug: 'test-org',
  logo: 'https://cdn.test/logo.png',
  brandLogo: null,
  tagline: 'Public tagline that must stay out of the shell payload',
  overview: 'Public overview that must stay out of the shell payload',
  website: 'https://example.com',
  metadata: null,
  brandColor: '#0103B8',
  font: DEFAULT_ORGANIZATION_FONT,
  createdAt: new Date('2026-05-19T00:00:00.000Z'),
}

const userOrganization: UserOrganizationRecord = {
  id: organization.id,
  name: organization.name,
  slug: organization.slug,
  logo: organization.logo ?? null,
  role: 'member',
  createdAt: new Date('2026-05-19T00:00:00.000Z'),
}

function createDependencies(
  options: {
    organizationBySlug?: OrganizationProfile | null
    membership?: AuthMembership | null
    userOrganizations?: UserOrganizationRecord[]
  } = {}
): Required<AppShellResolverDependencies> {
  return {
    authService: {
      getUserOrganizationMembership: mock(async () =>
        options.membership === undefined
          ? {
              role: 'member',
              organizationId: organization.id,
              organizationName: organization.name,
            }
          : options.membership
      ),
    },
    organizationService: {
      getBySlug: mock(async () =>
        options.organizationBySlug === undefined ? organization : options.organizationBySlug
      ),
      listUserOrganizations: mock(async () => options.userOrganizations ?? [userOrganization]),
    },
  }
}

async function executeGraphQL(input: {
  query: string
  variables?: Record<string, unknown>
  user?: GraphQLServerContext['user']
  dependencies?: AppShellResolverDependencies
}): Promise<{ body: GraphQLResponse; timingHeader: string }> {
  const server = createGraphQLServer({ appShell: input.dependencies })
  const serverTiming = createGraphQLServerTiming()
  const response = await server.handle(
    new Request('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: input.query,
        variables: input.variables,
      }),
    }),
    {
      user: 'user' in input ? input.user : viewer,
      serverTiming,
    }
  )

  return {
    body: (await response.json()) as GraphQLResponse,
    timingHeader: serverTiming.toHeader(),
  }
}

describe('App shell GraphQL bootstraps', () => {
  test('returns an authenticated requester with no active organization for MeShellBootstrap', async () => {
    const dependencies = createDependencies({ userOrganizations: [] })

    const { body } = await executeGraphQL({
      query: meShellBootstrapQuery,
      dependencies,
    })

    expect(body.errors).toBeUndefined()
    expect(body.data?.viewer).toEqual({
      id: viewer.id,
      email: viewer.email,
      name: viewer.name,
      image: viewer.image,
      activeOrganization: null,
    })
  })

  test('returns an authenticated member with active organization for MeShellBootstrap', async () => {
    const dependencies = createDependencies()

    const { body, timingHeader } = await executeGraphQL({
      query: meShellBootstrapQuery,
      dependencies,
    })

    expect(body.errors).toBeUndefined()
    expect(body.data?.viewer).toEqual({
      id: viewer.id,
      email: viewer.email,
      name: viewer.name,
      image: viewer.image,
      activeOrganization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
      },
    })
    expect(timingHeader).toContain('graphql_viewer')
    expect(timingHeader).toContain('graphql_viewer_active_org')
  })

  test('returns null viewer for unauthenticated MeShellBootstrap', async () => {
    const { body } = await executeGraphQL({
      query: meShellBootstrapQuery,
      user: null,
      dependencies: createDependencies(),
    })

    expect(body.errors).toBeUndefined()
    expect(body.data?.viewer).toBeNull()
  })

  for (const role of ['member', 'admin', 'owner'] as const) {
    test(`returns org workspace bootstrap for ${role} role`, async () => {
      const dependencies = createDependencies({
        membership: {
          role,
          organizationId: organization.id,
          organizationName: organization.name,
        },
      })

      const { body, timingHeader } = await executeGraphQL({
        query: orgWorkspaceBootstrapQuery,
        variables: { slug: organization.slug },
        dependencies,
      })

      expect(body.errors).toBeUndefined()
      expect(body.data?.viewer).toEqual({
        id: viewer.id,
        email: viewer.email,
        name: viewer.name,
        image: viewer.image,
      })
      expect(body.data?.organizationBySlug).toEqual({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        brandColor: organization.brandColor,
        font: DEFAULT_ORGANIZATION_FONT,
        currentUserRole: role,
      })
      expect(timingHeader).toContain('graphql_org_lookup')
      expect(timingHeader).toContain('graphql_membership_lookup')
      expect(timingHeader).not.toContain('graphql_viewer_active_org')
    })
  }

  test('returns NOT_FOUND for an unknown organization slug', async () => {
    const { body } = await executeGraphQL({
      query: orgWorkspaceBootstrapQuery,
      variables: { slug: 'missing-org' },
      dependencies: createDependencies({ organizationBySlug: null }),
    })

    expect(body.data?.organizationBySlug).toBeNull()
    expect(body.errors?.[0]?.extensions?.code).toBe('NOT_FOUND')
  })

  test('returns FORBIDDEN for an authenticated non-member', async () => {
    const { body } = await executeGraphQL({
      query: orgWorkspaceBootstrapQuery,
      variables: { slug: organization.slug },
      dependencies: createDependencies({ membership: null }),
    })

    expect(body.data?.organizationBySlug).toBeNull()
    expect(body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
  })

  test('returns UNAUTHENTICATED for unauthenticated OrgWorkspaceBootstrap', async () => {
    const { body, timingHeader } = await executeGraphQL({
      query: orgWorkspaceBootstrapQuery,
      variables: { slug: organization.slug },
      user: null,
      dependencies: createDependencies(),
    })

    expect(body.data?.viewer).toBeNull()
    expect(body.data?.organizationBySlug).toBeNull()
    expect(body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
    expect(timingHeader).not.toContain('graphql_org_lookup')
    expect(timingHeader).not.toContain('graphql_membership_lookup')
  })
})
