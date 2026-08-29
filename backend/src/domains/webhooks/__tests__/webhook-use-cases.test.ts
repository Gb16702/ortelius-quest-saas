import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PostmarkInboundUseCaseDependencies } from '../application/ports'
import type { PostmarkInboundPayload } from '../application/webhook-models'
import { ProcessPostmarkInboundUseCase } from '../application/webhook-use-cases'

const payload: PostmarkInboundPayload = {
  From: 'ada@example.com',
  FromName: 'Ada',
  FromFull: { Email: 'ada@example.com', Name: 'Ada', MailboxHash: '' },
  To: 'acme@inbound.ortelius.app',
  ToFull: [{ Email: 'acme@inbound.ortelius.app', Name: '', MailboxHash: '' }],
  Subject: 'Need customs help',
  TextBody: 'Please help tomorrow',
  MessageID: 'message-1',
  Date: '2026-01-01',
}

function createDeps(): PostmarkInboundUseCaseDependencies {
  return {
    organizations: {
      getOrganizationBySlug: mock(async () => ({
        id: 'org_1',
        slug: 'acme',
        emailIntakeEnabled: true,
      })),
    },
    requests: {
      existsBySourceEmailId: mock(async () => false),
      createDraftRequest: mock(async () => {}),
    },
    extractionContext: {
      getExtractionContext: mock(async () => ({
        availableServices: [{ id: 'svc_1', name: 'Customs' }],
        availableCategories: [{ id: 'cat_1', name: 'Cargo' }],
      })),
    },
    emailExtraction: {
      extractFromEmail: mock(async () => ({
        requesterName: 'Ada Lovelace',
        requesterPhone: null,
        categories: ['cat_1'],
        services: ['svc_1'],
        extraServices: null,
        cargoDetails: null,
        fromDate: null,
        toDate: null,
      })),
    },
    ids: {
      newRequestId: mock(() => 'req_1'),
    },
    clock: {
      now: mock(() => new Date('2026-01-01T00:00:00.000Z')),
    },
  }
}

describe('Webhook use cases', () => {
  let deps: PostmarkInboundUseCaseDependencies

  beforeEach(() => {
    deps = createDeps()
  })

  it('creates a draft request from a valid Postmark inbound payload', async () => {
    await new ProcessPostmarkInboundUseCase(deps).execute(payload)

    expect(deps.extractionContext.getExtractionContext).toHaveBeenCalledWith('org_1')
    expect(deps.emailExtraction.extractFromEmail).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({
        availableServices: [{ id: 'svc_1', name: 'Customs' }],
      })
    )
    expect(deps.requests.createDraftRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'req_1',
        reqNumber: 'REQ-1767225600000',
        requesterEmail: 'ada@example.com',
        requesterName: 'Ada Lovelace',
        receiverOrganizationId: 'org_1',
        fromDate: new Date('2026-01-01T00:00:00.000Z'),
        toDate: new Date('2026-01-08T00:00:00.000Z'),
      })
    )
  })

  it('does not extract or create a request for duplicate messages', async () => {
    deps.requests.existsBySourceEmailId = mock(async () => true)

    await new ProcessPostmarkInboundUseCase(deps).execute(payload)

    expect(deps.emailExtraction.extractFromEmail).not.toHaveBeenCalled()
    expect(deps.requests.createDraftRequest).not.toHaveBeenCalled()
  })
})
