import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { AssistantRepositoryPort } from '../application/ports'
import type { StreamAssistantMessageInput } from '../infrastructure/assistant-ai.service'
import { createAssistantTools, normalizeActionRoutePath } from '../infrastructure/assistant-tools'

const request = {
  user: {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    image: null,
    role: 'member',
  },
  message: 'Open branding settings',
  context: {
    organizationId: 'org-1',
    routePath: '/org/ortelius/dashboard',
  },
} satisfies StreamAssistantMessageInput

const organizationContext = {
  organization: {
    id: 'org-1',
    name: 'Ortelius',
    slug: 'ortelius',
    status: 'active',
    tagline: null,
  },
  membership: { role: 'admin' },
  subscription: null,
  usage: {
    memberCount: 1,
    pendingInvitationCount: 0,
  },
}

const repository = {
  createAction: mock((input) =>
    Promise.resolve({
      ...input,
      id: 'action-1',
      conversationId: input.conversationId ?? null,
      organizationId: input.organizationId ?? null,
      status: 'proposed',
      result: null,
      errorMessage: null,
      confirmedAt: null,
      executedAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-06-11T12:00:00.000Z'),
      updatedAt: new Date('2026-06-11T12:00:00.000Z'),
    })
  ),
  getOrganizationContextForUser: mock(() => Promise.resolve(organizationContext)),
} as unknown as AssistantRepositoryPort

describe('Assistant tools', () => {
  beforeEach(() => {
    repository.createAction.mockClear()
    repository.getOrganizationContextForUser.mockClear()
    repository.getOrganizationContextForUser.mockResolvedValue(organizationContext)
  })

  it('normalizes organization id route segments to the organization slug', async () => {
    const routePath = await normalizeActionRoutePath({
      routePath: '/org/org-1/settings/branding',
      request,
      repository,
    })

    expect(routePath).toBe('/org/ortelius/settings/branding')
  })

  it('resolves route patterns that use the slug placeholder', async () => {
    const routePath = await normalizeActionRoutePath({
      routePath: '/org/:slug/settings/branding',
      request,
      repository,
    })

    expect(routePath).toBe('/org/ortelius/settings/branding')
  })

  it('returns current role access metadata with searched capabilities', async () => {
    repository.getOrganizationContextForUser.mockResolvedValueOnce({
      organization: {
        id: 'org-1',
        name: 'Ortelius',
        slug: 'ortelius',
        status: 'active',
        tagline: null,
      },
      membership: { role: 'member' },
      subscription: null,
      usage: {
        memberCount: 1,
        pendingInvitationCount: 0,
      },
    })
    const searchTool = getAssistantTool<{ query: string }, unknown>(
      'search_app_capabilities',
      createAssistantTools(request, repository)
    )

    const result = await searchTool.execute({ query: 'public company page sentence' })

    expect(result).toEqual({
      capabilities: [
        expect.objectContaining({
          id: 'organization-branding',
          requiredRole: 'admin',
          userAccess: {
            currentRole: 'member',
            allowed: false,
            reason: 'This page requires the admin role or higher.',
          },
        }),
      ],
    })
  })

  it('publishes contextual status events for capability searches', async () => {
    const events = {
      publish: mock(() => undefined),
    }
    const searchTool = getAssistantTool<{ query: string }, unknown>(
      'search_app_capabilities',
      createAssistantTools(request, repository, events)
    )

    await searchTool.execute({ query: 'branding settings' })

    expect(events.publish).toHaveBeenCalledWith({
      name: 'quest_assistant:status',
      value: {
        label: 'Finding a match for "branding settings"',
        body: 'I\'m searching Quest for "branding settings" so I can route the request to the right page, setting, or permission.',
      },
    })
  })

  it('does not propose opening an admin page for a member', async () => {
    repository.getOrganizationContextForUser.mockResolvedValue({
      organization: {
        id: 'org-1',
        name: 'Ortelius',
        slug: 'ortelius',
        status: 'active',
        tagline: null,
      },
      membership: { role: 'member' },
      subscription: null,
      usage: {
        memberCount: 1,
        pendingInvitationCount: 0,
      },
    })
    const proposeActionTool = getAssistantTool<
      {
        type: 'open_page'
        title: string
        summary: string
        payload: { routePath: string }
      },
      unknown
    >(
      'propose_assistant_action',
      createAssistantTools({ ...request, conversationId: 'c-1' }, repository)
    )

    const result = await proposeActionTool.execute({
      type: 'open_page',
      title: 'Organization Branding',
      summary: 'Open branding settings.',
      payload: {
        routePath: '/org/ortelius/settings/branding',
      },
    })

    expect(result).toEqual({
      action: null,
      reason: 'This action requires the admin role or higher.',
    })
    expect(repository.createAction).not.toHaveBeenCalled()
  })

  it('does not propose unknown routes that are absent from the capability registry', async () => {
    const proposeActionTool = getAssistantTool<
      {
        type: 'open_page'
        title: string
        summary: string
        payload: { routePath: string }
      },
      unknown
    >(
      'propose_assistant_action',
      createAssistantTools({ ...request, conversationId: 'conversation-1' }, repository)
    )

    const result = await proposeActionTool.execute({
      type: 'open_page',
      title: 'Open admin page',
      summary: 'Take you to the Quest admin area.',
      payload: {
        routePath: '/org/ortelius/admin',
      },
    })

    expect(result).toEqual({
      action: null,
      reason:
        'No registered Quest page matches /org/ortelius/admin. Search the capability map and propose one of its routePattern values instead.',
    })
    expect(repository.createAction).not.toHaveBeenCalled()
  })

  it('does not propose route groups that are not concrete registered pages', async () => {
    const proposeActionTool = getAssistantTool<
      {
        type: 'open_page'
        title: string
        summary: string
        payload: { routePath: string }
      },
      unknown
    >(
      'propose_assistant_action',
      createAssistantTools({ ...request, conversationId: 'conversation-1' }, repository)
    )

    const result = await proposeActionTool.execute({
      type: 'open_page',
      title: 'Open settings',
      summary: 'Take you to Quest settings.',
      payload: {
        routePath: '/org/ortelius/settings',
      },
    })

    expect(result).toEqual({
      action: null,
      reason:
        'No registered Quest page matches /org/ortelius/settings. Search the capability map and propose one of its routePattern values instead.',
    })
    expect(repository.createAction).not.toHaveBeenCalled()
  })

  it('publishes action proposal stream events with serialized action payloads', async () => {
    const events = {
      publish: mock(() => undefined),
    }
    const proposeActionTool = getAssistantTool<
      {
        type: 'open_page'
        title: string
        summary: string
        buttonLabel: string
        payload: { routePath: string }
      },
      unknown
    >(
      'propose_assistant_action',
      createAssistantTools({ ...request, conversationId: 'conversation-1' }, repository, events)
    )

    const result = await proposeActionTool.execute({
      type: 'open_page',
      title: 'Organization Branding',
      summary: 'Open branding settings.',
      buttonLabel: 'Open branding',
      payload: {
        routePath: '/org/ortelius/settings/branding',
      },
    })

    expect(result).toEqual({
      action: expect.objectContaining({
        id: 'action-1',
        conversationId: 'conversation-1',
        expiresAt: expect.any(String),
      }),
      reason: null,
    })
    expect(events.publish).toHaveBeenCalledWith({
      name: 'quest_assistant:action_proposed',
      value: {
        action: expect.objectContaining({
          id: 'action-1',
          conversationId: 'conversation-1',
          expiresAt: expect.any(String),
          createdAt: '2026-06-11T12:00:00.000Z',
          updatedAt: '2026-06-11T12:00:00.000Z',
        }),
      },
    })
    expect(events.publish).toHaveBeenCalledWith({
      name: 'quest_assistant:status',
      value: {
        label: 'Preparing "Organization Branding"',
        body: 'I\'m validating access and preparing "Open branding settings." for branding before showing the confirmation card.',
      },
    })
  })
})

function getAssistantTool<TInput, TOutput>(
  name: string,
  tools: ReturnType<typeof createAssistantTools>
): { execute(input: TInput): Promise<TOutput> } {
  const tool = tools.find((item) => item.name === name)
  if (!tool) throw new Error(`Tool ${name} not found`)

  return tool as unknown as { execute(input: TInput): Promise<TOutput> }
}
