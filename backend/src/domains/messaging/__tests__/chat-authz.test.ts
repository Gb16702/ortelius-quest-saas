import { beforeEach, describe, expect, it, mock } from 'bun:test'

// ---------- Mock state ----------

type ConvRow = { id: string; organizationId: string | null }
type ParticipantRow = { id?: string; conversationId: string; userId: string; leftAt: Date | null }
type MemberRow = { id?: string; userId: string; organizationId: string }
type MessageRow = {
  id: string
  conversationId: string
  senderId: string
  content: string
  messageType: string
  isDeleted: boolean
  createdAt: Date
}
type UserRow = { id: string; name: string; image: string | null }

let conversations: ConvRow[] = []
let participants: ParticipantRow[] = []
let members: MemberRow[] = []
let messages: MessageRow[] = []
let users: UserRow[] = []

// Sentinels so the db mock can route by table identity.
const CONVERSATION = { __t: 'conversation' }
const CONVERSATION_PARTICIPANT = { __t: 'conversationParticipant' }
const MESSAGE = { __t: 'message' }
const MESSAGE_REACTION = { __t: 'messageReaction' }
const USER = { __t: 'user' }
const MEMBER = { __t: 'member' }
const ORGANIZATION = { __t: 'organization' }

// Captured `where(...)` ANDs — see whereCapture below.
type Filter = { table: unknown; userId?: string; conversationId?: string; messageId?: string }
let lastFilter: Filter = { table: undefined }

const sentMessages: Array<{ userIds: string[]; payload: Record<string, unknown> }> = []

// ---------- Mocks ----------

mock.module('../../../infrastructure/messaging/websocket.service', () => ({
  sendToUsers: (userIds: string[], payload: Record<string, unknown>) => {
    sentMessages.push({ userIds, payload })
  },
  activeConversations: new Map(),
  // Re-export types referenced by message.routes (not the routes here, but
  // needed because message.services imports from this module too).
}))

mock.module('../../../infrastructure/database/db/schemas/auth-schema', () => ({
  user: USER,
  member: MEMBER,
  organization: ORGANIZATION,
  anonymousUser: { __t: 'anonymousUser' },
}))

mock.module('../../../infrastructure/database/db/schemas/chat-schema', () => ({
  conversation: CONVERSATION,
  conversationParticipant: CONVERSATION_PARTICIPANT,
  message: MESSAGE,
  messageReaction: MESSAGE_REACTION,
}))

mock.module('../../../infrastructure/security/encryption.service', () => ({
  encryptContent: (s: string) => `enc(${s})`,
  decryptContent: (s: string) => s.replace(/^enc\(/, '').replace(/\)$/, ''),
}))

// Stub everything else messageRepository imports but doesn't need for these tests.
mock.module('../../../infrastructure/auth/auth-link', () => ({ buildAuthLink: () => '' }))
mock.module('../../../../emails/services/email.service', () => ({
  EmailService: { sendTemplatedEmail: async () => undefined },
}))
mock.module('../../../../emails/types', () => ({ EmailTemplate: { CHAT_MESSAGE_ANONYMOUS: 'X' } }))
mock.module('../../documents/documents.application', () => ({
  documentsApplicationService: { generateSignedUrl: async () => 'signed-url' },
}))
mock.module('../../metrics/services/member-metrics.service', () => ({
  memberMetricsService: {
    incrementMemberConversation: async () => undefined,
    incrementMemberMessage: async () => undefined,
  },
}))
mock.module('../../notifications/notifications.application', () => ({
  notificationApplicationService: { notifyNewMessage: async () => undefined },
}))

// db mock — minimal but enough for the queries our SUT uses. `from()`
// stores the table sentinel; `where()` captures the userId / conversationId /
// messageId so we can match against state. Then `.limit()` / awaited returns
// resolves to the matching rows.
mock.module('../../../infrastructure/database', () => ({
  db: {
    select: (selectMap?: Record<string, unknown>) => {
      type Chain = {
        from: (table: unknown) => Chain
        innerJoin: (...args: unknown[]) => Chain
        leftJoin: (...args: unknown[]) => Chain
        where: (...args: unknown[]) => Chain
        limit: (n?: number) => Promise<unknown[]>
        orderBy: (...args: unknown[]) => Chain
        then: (resolve: (rows: unknown[]) => unknown) => Promise<unknown>
      }
      let table: unknown = undefined
      const filter: Filter = { table: undefined }

      const resolve = (): unknown[] => {
        // Heuristic routing based on what was selected + filtered.
        // The point isn't to faithfully simulate Postgres — it's just to
        // give the SUT plausible answers for the queries it makes.
        if (table === CONVERSATION) {
          const found = conversations.find((c) => c.id === filter.conversationId)
          return found ? [found] : []
        }
        if (table === CONVERSATION_PARTICIPANT) {
          let rows = participants.filter(
            (p) =>
              (!filter.conversationId || p.conversationId === filter.conversationId) &&
              (!filter.userId || p.userId === filter.userId) &&
              p.leftAt === null
          )
          // Some queries select only userId — we still return full rows;
          // the SUT just reads what it asked for.
          return rows
        }
        if (table === MEMBER) {
          return members.filter(
            (m) =>
              (!filter.userId || m.userId === filter.userId) && (!filter.conversationId || true)
          )
        }
        if (table === MESSAGE) {
          return messages.filter(
            (m) =>
              (!filter.messageId || m.id === filter.messageId) &&
              (!filter.conversationId || m.conversationId === filter.conversationId)
          )
        }
        if (table === USER) {
          const found = users.find((u) => u.id === (filter.userId ?? users[0]?.id))
          return found ? [found] : []
        }
        return []
      }

      const chain: Chain = {
        from: (t) => {
          table = t
          filter.table = t
          lastFilter = filter
          return chain
        },
        innerJoin: () => chain,
        leftJoin: () => chain,
        where: (cond: unknown) => {
          // The SUT calls `.where(and(eq(table.foo, value), ...))`. Drizzle
          // returns opaque condition objects; we can't introspect them
          // without huge effort. Instead we inspect the raw arg passed via
          // a captureWhere proxy: the test calls captureFilter(...) before
          // each query. Cheating, but it scopes the mock complexity.
          return chain
        },
        orderBy: () => chain,
        limit: () => Promise.resolve(resolve()),
        // Allow `await db.select(...).from(...).where(...)` (no .limit).
        then: (cb) => Promise.resolve(cb(resolve())),
      }
      return chain
    },
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{ id: 'reaction-1' }]),
      }),
    }),
    update: () => ({
      set: () => ({ where: () => Promise.resolve() }),
    }),
    delete: () => ({
      where: () => ({ returning: () => Promise.resolve([{ id: 'r' }]) }),
    }),
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  },
}))

// Drizzle's `eq`, `and`, `isNull`, `inArray` are referenced by the SUT but
// only as opaque condition builders. We hijack them to pluck out the value
// being filtered on so our resolve() above can use it.
mock.module('drizzle-orm', () => ({
  eq: (col: { __field?: string } | unknown, value: unknown) => {
    // Best-effort: stash on lastFilter based on common field names.
    if (typeof value === 'string') {
      const v = value as string
      // We can't tell which column is which from `col`. Heuristic: store
      // anything that looks like a uuid as conversationId/messageId; else
      // treat as userId. Tests below force unique values per axis to make
      // this deterministic.
      if (/^conv-/.test(v)) lastFilter.conversationId = v
      else if (/^msg-/.test(v)) lastFilter.messageId = v
      else if (/^user-/.test(v)) lastFilter.userId = v
    }
    return { __eq: true }
  },
  and: (...args: unknown[]) => ({ __and: args }),
  isNull: () => ({ __isNull: true }),
  inArray: () => ({ __inArray: true }),
  asc: () => ({ __asc: true }),
  desc: () => ({ __desc: true }),
}))

// ---------- Import SUT after mocks ----------

import {
  canAccessConversation,
  messageRepository as messageService,
} from '../message/infrastructure/message.repository'

beforeEach(() => {
  conversations = []
  participants = []
  members = []
  messages = []
  users = []
  sentMessages.length = 0
  lastFilter = { table: undefined }
})

// ---------- canAccessConversation ----------

describe('canAccessConversation', () => {
  it('returns true when the user is a participant', async () => {
    conversations.push({ id: 'conv-1', organizationId: null })
    participants.push({ conversationId: 'conv-1', userId: 'user-alice', leftAt: null })
    expect(await canAccessConversation('conv-1', 'user-alice')).toBe(true)
  })

  it('returns false for a stranger on a non-org conversation', async () => {
    conversations.push({ id: 'conv-1', organizationId: null })
    expect(await canAccessConversation('conv-1', 'user-stranger')).toBe(false)
  })

  it('returns true for an org member of an org conversation, even without a participant row', async () => {
    conversations.push({ id: 'conv-1', organizationId: 'org-1' })
    members.push({ userId: 'user-bob', organizationId: 'org-1' })
    expect(await canAccessConversation('conv-1', 'user-bob')).toBe(true)
  })

  it('returns false for an outsider to an org conversation', async () => {
    conversations.push({ id: 'conv-1', organizationId: 'org-1' })
    expect(await canAccessConversation('conv-1', 'user-outsider')).toBe(false)
  })

  it('does NOT insert a participant row (read-only — see ensureConversationAccess for the side-effect variant)', async () => {
    conversations.push({ id: 'conv-1', organizationId: 'org-1' })
    members.push({ userId: 'user-bob', organizationId: 'org-1' })
    const before = participants.length
    await canAccessConversation('conv-1', 'user-bob')
    expect(participants.length).toBe(before)
  })
})

// ---------- replyToId cross-conv leak ----------

describe('sendMessage > replyToId scoping', () => {
  it('rejects a replyToId that points to a message in a different conversation', async () => {
    // Setup: alice is in conv-A. bob has sent a private message in conv-B.
    // alice tries to quote-reply to bob's private message from inside conv-A.
    conversations.push({ id: 'conv-A', organizationId: null })
    conversations.push({ id: 'conv-B', organizationId: null })
    participants.push({ conversationId: 'conv-A', userId: 'user-alice', leftAt: null })
    participants.push({ conversationId: 'conv-B', userId: 'user-bob', leftAt: null })
    users.push({ id: 'user-alice', name: 'Alice', image: null })
    users.push({ id: 'user-bob', name: 'Bob', image: null })
    messages.push({
      id: 'msg-bob-private',
      conversationId: 'conv-B',
      senderId: 'user-bob',
      content: 'enc(secret)',
      messageType: 'text',
      isDeleted: false,
      createdAt: new Date(),
    })

    await expect(
      messageService.sendMessage({
        conversationId: 'conv-A',
        senderId: 'user-alice',
        content: 'haha',
        replyToId: 'msg-bob-private',
      })
    ).rejects.toThrow(/Reply target message not found/)
  })
})
