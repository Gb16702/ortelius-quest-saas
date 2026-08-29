export type QuestCapabilityArea =
  | 'account'
  | 'activity'
  | 'billing'
  | 'branding'
  | 'business'
  | 'chats'
  | 'invoices'
  | 'legals'
  | 'requests'
  | 'team'

export interface QuestCapability {
  id: string
  area: QuestCapabilityArea
  title: string
  summary: string
  routePattern: string
  requiredRole: QuestMembershipRole
  planRequirement: 'free' | 'professional' | 'enterprise' | 'unknown'
  keywords: string[]
}

export type QuestMembershipRole = 'member' | 'admin' | 'owner'

export interface QuestCapabilitySearchInput {
  query: string
  limit?: number
}

export const QUEST_CAPABILITIES: QuestCapability[] = [
  {
    id: 'organization-branding',
    area: 'branding',
    title: 'Organization branding and public profile',
    summary:
      'Update organization name, workspace URL slug, logo, tagline, website, overview, brand color, and font.',
    routePattern: '/org/:slug/settings/branding',
    requiredRole: 'admin',
    planRequirement: 'free',
    keywords: [
      'branding',
      'brand',
      'tagline',
      'slogan',
      'logo',
      'name',
      'slug',
      'workspace url',
      'website',
      'overview',
      'profile',
      'color',
      'font',
    ],
  },
  {
    id: 'organization-business',
    area: 'business',
    title: 'Business settings',
    summary: 'Configure business service categories and operational data used by requests.',
    routePattern: '/org/:slug/settings/business',
    requiredRole: 'admin',
    planRequirement: 'free',
    keywords: ['business', 'services', 'service type', 'catalog', 'cargo', 'storage', 'logistics'],
  },
  {
    id: 'subscription-billing',
    area: 'billing',
    title: 'Billing and subscription',
    summary: 'Review subscription state, plan, seats, payment method, and billing address.',
    routePattern: '/org/:slug/settings/billing',
    requiredRole: 'admin',
    planRequirement: 'free',
    keywords: ['billing', 'subscription', 'plan', 'trial', 'payment', 'seats', 'upgrade', 'cancel'],
  },
  {
    id: 'invoice-settings',
    area: 'invoices',
    title: 'Invoice settings',
    summary: 'Configure invoice email recipient and invoice language.',
    routePattern: '/org/:slug/settings/invoices',
    requiredRole: 'admin',
    planRequirement: 'free',
    keywords: ['invoice', 'invoices', 'invoice email', 'recipient', 'language', 'locale'],
  },
  {
    id: 'legal-documents',
    area: 'legals',
    title: 'Legal documents',
    summary: 'Manage legal documents that can be attached to quotes and requests.',
    routePattern: '/org/:slug/settings/legals',
    requiredRole: 'admin',
    planRequirement: 'free',
    keywords: ['legal', 'legals', 'documents', 'terms', 'quote documents', 'contract'],
  },
  {
    id: 'organization-requests',
    area: 'requests',
    title: 'Organization requests',
    summary: 'View and manage organization requests, statuses, quotes, invoices, and assignments.',
    routePattern: '/org/:slug/requests',
    requiredRole: 'member',
    planRequirement: 'free',
    keywords: ['requests', 'request', 'quote', 'quotes', 'assignment', 'status', 'invoices'],
  },
  {
    id: 'personal-requests',
    area: 'requests',
    title: 'Personal requests',
    summary: 'View requests associated with the current user outside an organization workspace.',
    routePattern: '/me/requests',
    requiredRole: 'member',
    planRequirement: 'free',
    keywords: ['my requests', 'personal requests', 'me requests'],
  },
  {
    id: 'organization-chats',
    area: 'chats',
    title: 'Organization chats',
    summary: 'Open organization conversations and request-related chats.',
    routePattern: '/org/:slug/chats',
    requiredRole: 'member',
    planRequirement: 'free',
    keywords: ['chat', 'chats', 'conversation', 'conversations', 'messages', 'inbox'],
  },
  {
    id: 'personal-chats',
    area: 'chats',
    title: 'Personal chats',
    summary: 'Open personal conversations outside an organization workspace.',
    routePattern: '/me/chats',
    requiredRole: 'member',
    planRequirement: 'free',
    keywords: ['my chats', 'personal chats', 'direct messages'],
  },
  {
    id: 'team-members',
    area: 'team',
    title: 'Team members',
    summary: 'Manage organization members and roles.',
    routePattern: '/org/:slug/team/members',
    requiredRole: 'admin',
    planRequirement: 'free',
    keywords: ['team', 'members', 'roles', 'admin', 'owner', 'member access'],
  },
  {
    id: 'team-invitations',
    area: 'team',
    title: 'Team invitations',
    summary: 'Invite new members and review pending invitations.',
    routePattern: '/org/:slug/team/invitations',
    requiredRole: 'admin',
    planRequirement: 'free',
    keywords: ['invite', 'invitation', 'invitations', 'pending invites', 'team access'],
  },
  {
    id: 'team-activity',
    area: 'activity',
    title: 'Team activity',
    summary: 'Review recent organization activity and audit-style events.',
    routePattern: '/org/:slug/team/activity',
    requiredRole: 'member',
    planRequirement: 'free',
    keywords: ['activity', 'events', 'audit', 'history', 'recent changes'],
  },
  {
    id: 'account-settings',
    area: 'account',
    title: 'Account settings',
    summary: 'Manage the current user account settings.',
    routePattern: '/me/account',
    requiredRole: 'member',
    planRequirement: 'free',
    keywords: ['account', 'profile', 'user settings', 'personal settings', 'email'],
  },
]

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase()
}

function getCapabilityHaystack(capability: QuestCapability): string {
  return [
    capability.id,
    capability.area,
    capability.title,
    capability.summary,
    capability.routePattern,
    ...capability.keywords,
  ]
    .join(' ')
    .toLowerCase()
}

function scoreCapability(capability: QuestCapability, terms: string[]): number {
  const haystack = getCapabilityHaystack(capability)
  let score = 0

  for (const term of terms) {
    if (capability.id.toLowerCase() === term) score += 8
    if (capability.area === term) score += 6
    if (capability.title.toLowerCase().includes(term)) score += 5
    if (capability.keywords.some((keyword) => keyword.toLowerCase().includes(term))) {
      score += 4
    }
    if (haystack.includes(term)) score += 1
  }

  return score
}

const roleRankByRole = {
  member: 1,
  admin: 2,
  owner: 3,
} satisfies Record<QuestMembershipRole, number>

export function isQuestMembershipRole(
  role: string | null | undefined
): role is QuestMembershipRole {
  return role === 'member' || role === 'admin' || role === 'owner'
}

export function canRoleAccessCapability(input: {
  role: string | null | undefined
  capability: QuestCapability
}): boolean {
  if (!isQuestMembershipRole(input.role)) return false

  return roleRankByRole[input.role] >= roleRankByRole[input.capability.requiredRole]
}

export function findQuestCapabilityByRoutePath(routePath: string): QuestCapability | null {
  const normalizedRoutePath = routePath.trim().split('?')[0]

  for (const capability of QUEST_CAPABILITIES) {
    const pattern = new RegExp(
      `^${capability.routePattern
        .split('/')
        .map((segment) => (segment.startsWith(':') ? '[^/]+' : escapeRegExp(segment)))
        .join('/')}$`
    )

    if (pattern.test(normalizedRoutePath)) {
      return capability
    }
  }

  return null
}

export function searchQuestCapabilities(input: QuestCapabilitySearchInput): QuestCapability[] {
  const normalizedQuery = normalizeSearchText(input.query)
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10)

  if (!normalizedQuery) {
    return QUEST_CAPABILITIES.slice(0, limit)
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean)

  return QUEST_CAPABILITIES.map((capability) => ({
    capability,
    score: scoreCapability(capability, terms),
  }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ capability }) => capability)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
