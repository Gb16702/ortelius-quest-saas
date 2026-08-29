import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Request, RequestWithRelations } from '../application/request-models'

let selectedRows: unknown[] = []
let selectedRowSets: unknown[][] = []
let insertedRowSets: unknown[][] = []
let updatedRowSets: unknown[][] = []
let insertedValues: unknown[] = []
let updateSets: unknown[] = []
let deletedTables: unknown[] = []

function nextSelectedRows(): unknown[] {
  return selectedRowSets.length ? selectedRowSets.shift()! : selectedRows
}

function nextInsertedRows(): unknown[] {
  return insertedRowSets.length ? insertedRowSets.shift()! : []
}

function nextUpdatedRows(): unknown[] {
  return updatedRowSets.length ? updatedRowSets.shift()! : []
}

function createQueryResult(rows: unknown[]) {
  const result = {
    orderBy: mock(() => result),
    limit: mock(() => result),
    offset: mock(() => result),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason?: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  }
  return result
}

function createSelectChain() {
  const chain = {
    leftJoin: mock(() => chain),
    innerJoin: mock(() => chain),
    where: mock(() => createQueryResult(nextSelectedRows())),
  }
  return chain
}

const fakeDb = {
  select: mock(() => ({
    from: mock(() => createSelectChain()),
  })),
  insert: mock(() => ({
    values: mock((data: unknown) => {
      insertedValues.push(data)
      return {
        returning: mock(async () => nextInsertedRows()),
      }
    }),
  })),
  update: mock((table: unknown) => ({
    set: mock((data: unknown) => {
      updateSets.push(data)
      return {
        where: mock(() => ({
          returning: mock(async () => nextUpdatedRows()),
          table,
        })),
      }
    }),
  })),
  delete: mock((table: unknown) => ({
    where: mock(async () => {
      deletedTables.push(table)
    }),
  })),
}

mock.module('../../../infrastructure/database', () => ({
  db: fakeDb,
}))

const { DrizzleRequestRepository } = await import('../infrastructure/drizzle-request.repository')

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    reqNumber: 'REQ-123',
    lifecycleStatus: 'open',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    receiverOrganizationId: 'org-1',
    fromDate: new Date('2026-07-08T00:00:00.000Z'),
    toDate: new Date('2026-07-09T00:00:00.000Z'),
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    ...overrides,
  }
}

function makeRequestWithRelations(
  overrides: Partial<RequestWithRelations> = {}
): RequestWithRelations {
  return {
    id: 'req-1',
    reqNumber: 'REQ-123',
    lifecycleStatus: 'open',
    requesterEmail: 'requester@example.com',
    requesterName: 'Requester',
    receiverOrganizationId: 'org-1',
    fromDate: new Date('2026-07-08T00:00:00.000Z'),
    toDate: new Date('2026-07-09T00:00:00.000Z'),
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    ...overrides,
  }
}

describe('DrizzleRequestRepository', () => {
  let repository: InstanceType<typeof DrizzleRequestRepository>

  beforeEach(() => {
    repository = new DrizzleRequestRepository()
    selectedRows = []
    selectedRowSets = []
    insertedRowSets = []
    updatedRowSets = []
    insertedValues = []
    updateSets = []
    deletedTables = []
    fakeDb.select.mockClear()
    fakeDb.insert.mockClear()
    fakeDb.update.mockClear()
    fakeDb.delete.mockClear()
  })

  it('creates requests and cargo details directly through Drizzle', async () => {
    insertedRowSets = [
      [{ id: 'dim-1' }],
      [{ id: 'cargo-1' }],
      [makeRequest({ cargoDetailsId: 'cargo-1' })],
    ]

    const request = await repository.create({
      requesterEmail: 'requester@example.com',
      requesterName: 'Requester',
      requesterId: 'requester-user',
      receiverOrganizationId: 'org-1',
      cargoDetails: {
        weight: 12,
        volume: 3,
        palletCount: 2,
        fragility: 'fragile',
        options: { hazardous: true },
        dimensions: { length: 10, width: 20, height: 30 },
      },
      fromDate: new Date('2026-05-08T00:00:00.000Z'),
      toDate: new Date('2026-05-09T00:00:00.000Z'),
    })

    expect(request.id).toBe('req-1')
    expect(fakeDb.insert).toHaveBeenCalledTimes(3)
    expect(insertedValues[0]).toEqual(
      expect.objectContaining({ length: 10, width: 20, height: 30 })
    )
    expect(insertedValues[1]).toEqual(
      expect.objectContaining({ weight: 12, dimensionsId: 'dim-1' })
    )
    expect(insertedValues[2]).toEqual(
      expect.objectContaining({
        lifecycleStatus: 'open',
        requesterEmail: 'requester@example.com',
        requesterId: 'requester-user',
        cargoDetailsId: 'cargo-1',
      })
    )
  })

  it('updates requests and cargo details directly through Drizzle', async () => {
    selectedRowSets = [
      [makeRequest({ cargoDetailsId: 'cargo-1' })],
      [{ id: 'cargo-1', dimensionsId: 'dim-1' }],
    ]
    updatedRowSets = [[makeRequest({ comments: 'Updated' })]]

    const request = await repository.update('req-1', {
      comments: 'Updated',
      cargoDetails: {
        weight: 14,
        volume: 4,
        dimensions: { length: 11, width: 21, height: 31 },
      },
    })

    expect(request.comments).toBe('Updated')
    expect(fakeDb.select).toHaveBeenCalledTimes(2)
    expect(fakeDb.update).toHaveBeenCalledTimes(3)
    expect(updateSets).toEqual([
      expect.objectContaining({ length: 11, width: 21, height: 31 }),
      expect.objectContaining({ weight: 14, volume: 4 }),
      expect.objectContaining({ comments: 'Updated' }),
    ])
  })

  it('attaches conversations to requests directly through Drizzle', async () => {
    await repository.attachConversationToRequest('req-1', 'conversation-1')

    expect(updateSets).toEqual([expect.objectContaining({ conversationId: 'conversation-1' })])
    expect(fakeDb.update).toHaveBeenCalledTimes(1)
  })

  it('loads requests directly from Drizzle', async () => {
    selectedRows = [makeRequest()]

    const request = await repository.getById('req-1')

    expect(request?.id).toBe('req-1')
    expect(fakeDb.select).toHaveBeenCalledTimes(1)
  })

  it('loads requests with relations directly through Drizzle', async () => {
    selectedRowSets = [
      [
        {
          ...makeRequest({
            categories: ['cat-1'],
            services: ['svc-1'],
            cargoDetailsId: 'cargo-1',
            assignedToId: 'member-1',
            assignedById: 'admin-1',
          }),
          organization: {
            id: 'org-1',
            name: 'Quest',
            slug: 'quest',
            logo: null,
            taxIdType: 'vat',
          },
        },
      ],
      [
        {
          id: 'cargo-1',
          weight: 12,
          volume: 3,
          palletCount: 2,
          fragility: 'fragile',
          options: { hazardous: true },
          dimensions: { length: 10, width: 20, height: 30 },
        },
      ],
      [
        {
          id: 'svc-1',
          name: 'Freight',
          slug: 'freight',
          type: 'cargo',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      ],
      [
        {
          id: 'cat-1',
          name: 'Cargo',
          slug: 'cargo',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      ],
      [{ id: 'member-1', name: 'Member', email: 'member@example.com', role: 'member' }],
      [{ id: 'admin-1', name: 'Admin', email: 'admin@example.com' }],
      [{ id: 'requester-user' }],
    ]

    const request = await repository.getByIdWithRelations('req-1')

    expect(request?.id).toBe('req-1')
    expect(request?.priority).toBeTruthy()
    expect(request?.organization).toEqual(
      expect.objectContaining({ id: 'org-1', name: 'Quest', slug: 'quest' })
    )
    expect(request?.requester).toEqual(
      expect.objectContaining({ id: 'requester-user', email: 'requester@example.com' })
    )
    expect(request?.assignedTo).toEqual(expect.objectContaining({ id: 'member-1', role: 'member' }))
    expect(request?.assignedBy).toEqual(expect.objectContaining({ id: 'admin-1' }))
    expect(request?.services?.[0]).toEqual(expect.objectContaining({ id: 'svc-1' }))
    expect(request?.categories?.[0]).toEqual(expect.objectContaining({ id: 'cat-1' }))
    expect(request?.cargoDetails).toEqual(
      expect.objectContaining({
        id: 'cargo-1',
        weight: 12,
        dimensions: { length: 10, width: 20, height: 30 },
      })
    )
    expect(fakeDb.select).toHaveBeenCalledTimes(7)
  })

  it('returns null with relations when the request is missing', async () => {
    selectedRows = []

    const request = await repository.getByIdWithRelations('missing')

    expect(request).toBeNull()
    expect(fakeDb.select).toHaveBeenCalledTimes(1)
  })

  it('loads requests by number through Drizzle before resolving relations', async () => {
    selectedRows = [{ id: 'req-1' }]
    const getByIdWithRelations = mock(async () => makeRequestWithRelations())
    repository.getByIdWithRelations = getByIdWithRelations

    const request = await repository.getByNumber('REQ-123')

    expect(request?.id).toBe('req-1')
    expect(fakeDb.select).toHaveBeenCalledTimes(1)
    expect(getByIdWithRelations).toHaveBeenCalledWith('req-1')
  })

  it('returns null by number without resolving relations when the request is missing', async () => {
    selectedRows = []
    const getByIdWithRelations = mock(async () => makeRequestWithRelations())
    repository.getByIdWithRelations = getByIdWithRelations

    const request = await repository.getByNumber('missing')

    expect(request).toBeNull()
    expect(fakeDb.select).toHaveBeenCalledTimes(1)
    expect(getByIdWithRelations).not.toHaveBeenCalled()
  })

  it('finds anonymous requests by requester email directly through Drizzle', async () => {
    selectedRows = [makeRequest({ requesterId: null })]

    const requests = await repository.findAnonymousByRequesterEmail('requester@example.com')

    expect(requests).toHaveLength(1)
    expect(requests[0].requesterEmail).toBe('requester@example.com')
    expect(fakeDb.select).toHaveBeenCalledTimes(1)
  })

  it('lists user requests directly through Drizzle with filters and pagination', async () => {
    selectedRows = [makeRequest({ requesterId: 'requester-user' })]

    const requests = await repository.getUserRequests('requester-user', {
      lifecycleStatus: 'open,quoted',
      organizationId: 'org-1',
      search: 'REQ',
      fromDate: new Date('2026-05-01T00:00:00.000Z'),
      toDate: new Date('2026-05-31T00:00:00.000Z'),
      page: 2,
      limit: 10,
    })

    expect(requests).toHaveLength(1)
    expect(requests[0].requesterId).toBe('requester-user')
    expect(fakeDb.select).toHaveBeenCalledTimes(1)
  })

  it('lists assigned and unassigned requests directly through Drizzle', async () => {
    selectedRowSets = [
      [makeRequest({ assignedToId: 'member-user' })],
      [makeRequest({ id: 'req-2', assignedToId: null })],
    ]

    const assignedRequests = await repository.getAssignedRequests('member-user', 'org-1', {
      lifecycleStatus: 'open',
      fromDate: new Date('2026-05-01T00:00:00.000Z'),
    })
    const unassignedRequests = await repository.getUnassignedRequests('org-1', {
      lifecycleStatus: 'open,quoted',
      toDate: new Date('2026-05-31T00:00:00.000Z'),
    })

    expect(assignedRequests).toHaveLength(1)
    expect(assignedRequests[0].assignedToId).toBe('member-user')
    expect(unassignedRequests).toHaveLength(1)
    expect(unassignedRequests[0].assignedToId).toBeNull()
    expect(fakeDb.select).toHaveBeenCalledTimes(2)
  })

  it('links anonymous requests to users directly through Drizzle', async () => {
    await repository.linkAnonymousRequestToUser('req-1', 'user-1', 'conversation-1')

    expect(updateSets).toEqual([
      expect.objectContaining({
        requesterId: 'user-1',
        conversationId: 'conversation-1',
      }),
    ])
    expect(fakeDb.update).toHaveBeenCalledTimes(1)
  })

  it('updates lifecycle statuses directly through Drizzle', async () => {
    await repository.reject('req-1', 'user-1', 'Not suitable')
    await repository.cancel('req-2', 'user-1')
    await repository.validateDraft('req-3', 'user-1')

    expect(updateSets).toEqual([
      expect.objectContaining({ lifecycleStatus: 'closed', closedReason: 'request_rejected' }),
      expect.objectContaining({ lifecycleStatus: 'closed', closedReason: 'cancelled' }),
      expect.objectContaining({ lifecycleStatus: 'open' }),
    ])
    expect(fakeDb.update).toHaveBeenCalledTimes(3)
  })

  it('deletes drafts directly through Drizzle', async () => {
    await repository.deleteDraft('req-1')

    expect(fakeDb.delete).toHaveBeenCalledTimes(1)
    expect(deletedTables).toHaveLength(1)
  })

  it('clears assignment directly after checking the request exists', async () => {
    selectedRows = [makeRequest({ assignedToId: 'member-1', assignedById: 'admin-1' })]

    await repository.unassignRequest('req-1')

    expect(fakeDb.select).toHaveBeenCalledTimes(1)
    expect(updateSets).toEqual([
      expect.objectContaining({
        assignedToId: null,
        assignedById: null,
        assignedAt: null,
      }),
    ])
  })

  it('removes document URLs directly through Drizzle when the request stores documents', async () => {
    selectedRows = [
      makeRequest({
        documents: ['https://cdn.test/keep.pdf', 'https://cdn.test/remove.pdf'],
      }),
    ]

    await repository.removeDocument('req-1', 'https://cdn.test/remove.pdf')

    expect(fakeDb.select).toHaveBeenCalledTimes(1)
    expect(updateSets).toEqual([
      expect.objectContaining({
        documents: ['https://cdn.test/keep.pdf'],
      }),
    ])
  })

  it('does not update document URLs when the request has no documents', async () => {
    selectedRows = [makeRequest({ documents: null })]

    await repository.removeDocument('req-1', 'https://cdn.test/remove.pdf')

    expect(fakeDb.select).toHaveBeenCalledTimes(1)
    expect(fakeDb.update).not.toHaveBeenCalled()
  })

  it('writes assignments and reassignments directly through Drizzle', async () => {
    await repository.assignToMember('req-1', 'member-1', 'admin-1')
    await repository.reassignToMember('req-1', 'member-2', 'admin-1')

    expect(updateSets).toEqual([
      expect.objectContaining({
        assignedToId: 'member-1',
        assignedById: 'admin-1',
      }),
      expect.objectContaining({
        assignedToId: 'member-2',
        assignedById: 'admin-1',
      }),
    ])
    expect(fakeDb.update).toHaveBeenCalledTimes(2)
  })
})
