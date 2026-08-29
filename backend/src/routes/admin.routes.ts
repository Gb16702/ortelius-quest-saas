import { asc, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { env } from '../infrastructure/config/environment'
import { db } from '../infrastructure/database'
import { adminAccessLog } from '../infrastructure/database/db/schemas/admin-access-log-schema'
import { aiUsageLog } from '../infrastructure/database/db/schemas/ai-usage-log-schema'
import { organization, subscription, user } from '../infrastructure/database/db/schemas/auth-schema'
import { category } from '../infrastructure/database/db/schemas/category-schema'
import { conversation, message } from '../infrastructure/database/db/schemas/chat-schema'
import { quote } from '../infrastructure/database/db/schemas/quote-schema'
import { request } from '../infrastructure/database/db/schemas/request-schema'
import { service } from '../infrastructure/database/db/schemas/services-schema'
import { createApiErrorResponse, ErrorCode } from '../infrastructure/types/api.types'

const adminRoutes = new Hono()

adminRoutes.use('*', async (c, next) => {
  const expected = env.ADMIN_SERVICE_TOKEN
  if (!expected)
    return c.json(
      createApiErrorResponse(ErrorCode.UPSTREAM_UNAVAILABLE, 'Admin proxy not configured'),
      503
    )
  if (c.req.header('authorization') !== `Bearer ${expected}`) {
    return c.json(createApiErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized'), 401)
  }
  await next()
})

function pagination(c: { req: { query: (k: string) => string | undefined } }) {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? 50)))
  return { page, limit, skip: (page - 1) * limit }
}

async function paginated<T>(
  table: T,
  where: SQL | undefined,
  orderBy: SQL,
  page: number,
  limit: number,
  skip: number
) {
  // biome-ignore lint/suspicious/noExplicitAny: drizzle generic
  const t = table as any
  const [items, [{ count }]] = await Promise.all([
    db.select().from(t).where(where).orderBy(orderBy).limit(limit).offset(skip),
    db.select({ count: sql<number>`count(*)::int` }).from(t).where(where),
  ])
  return { items, total: count, page, limit, totalPages: Math.max(1, Math.ceil(count / limit)) }
}

adminRoutes.get('/listing/users', async (c) => {
  const { page, limit, skip } = pagination(c)
  const search = c.req.query('search')?.trim()
  const where = search
    ? or(ilike(user.email, `%${search}%`), ilike(user.name, `%${search}%`))
    : undefined
  return c.json(await paginated(user, where, desc(user.createdAt), page, limit, skip))
})

adminRoutes.get('/listing/organizations', async (c) => {
  const { page, limit, skip } = pagination(c)
  const search = c.req.query('search')?.trim()
  const where = search
    ? or(ilike(organization.name, `%${search}%`), ilike(organization.slug, `%${search}%`))
    : undefined
  return c.json(
    await paginated(organization, where, desc(organization.createdAt), page, limit, skip)
  )
})

adminRoutes.get('/listing/requests', async (c) => {
  const { page, limit, skip } = pagination(c)
  const search = c.req.query('search')?.trim()
  const where = search
    ? or(ilike(request.reqNumber, `%${search}%`), ilike(request.requesterEmail, `%${search}%`))
    : undefined
  return c.json(await paginated(request, where, desc(request.createdAt), page, limit, skip))
})

adminRoutes.get('/listing/quotes', async (c) => {
  const { page, limit, skip } = pagination(c)
  const search = c.req.query('search')?.trim()
  const where = search ? ilike(quote.quoteNumber, `%${search}%`) : undefined
  return c.json(await paginated(quote, where, desc(quote.createdAt), page, limit, skip))
})

adminRoutes.get('/listing/conversations', async (c) => {
  const { page, limit, skip } = pagination(c)
  const search = c.req.query('search')?.trim()
  const where = search ? ilike(conversation.name, `%${search}%`) : undefined
  return c.json(
    await paginated(conversation, where, desc(conversation.createdAt), page, limit, skip)
  )
})

adminRoutes.get('/listing/subscriptions', async (c) => {
  const { page, limit, skip } = pagination(c)
  const search = c.req.query('search')?.trim()
  const where = search
    ? or(ilike(subscription.plan, `%${search}%`), ilike(subscription.status, `%${search}%`))
    : undefined
  return c.json(
    await paginated(subscription, where, desc(subscription.createdAt), page, limit, skip)
  )
})

adminRoutes.get('/audit', async (c) => {
  const { page, limit, skip } = pagination(c)
  const adminFilter = c.req.query('adminId')
  const resourceFilter = c.req.query('resource')
  const actionFilter = c.req.query('action')

  const where = [
    adminFilter ? sql`${adminAccessLog.adminSub} = ${adminFilter}` : undefined,
    resourceFilter ? sql`${adminAccessLog.resource} = ${resourceFilter}` : undefined,
    actionFilter ? sql`${adminAccessLog.action} = ${actionFilter}` : undefined,
  ].filter(Boolean) as SQL[]

  const whereClause = where.length ? sql`${where.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined

  const [items, [{ count }]] = await Promise.all([
    db
      .select()
      .from(adminAccessLog)
      .where(whereClause)
      .orderBy(desc(adminAccessLog.createdAt))
      .limit(limit)
      .offset(skip),
    db.select({ count: sql<number>`count(*)::int` }).from(adminAccessLog).where(whereClause),
  ])

  return c.json({
    items: items.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.resource,
      entityId: r.resourceId,
      adminId: r.adminSub,
      adminEmail: r.adminEmail,
      ip: r.ip,
      details: r.metadata,
      timestamp: r.createdAt?.toISOString(),
    })),
    total: count,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(count / limit)),
  })
})

adminRoutes.get('/listing/conversations/:id/messages', async (c) => {
  const id = c.req.param('id')
  const adminSub = c.req.header('x-admin-id')
  const adminEmail = c.req.header('x-admin-email')
  const reason = c.req.header('x-admin-reason') || c.req.query('reason')

  if (!adminSub)
    return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Missing admin identity'), 400)

  const [conv] = await db.select().from(conversation).where(eq(conversation.id, id)).limit(1)
  if (!conv)
    return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Conversation not found'), 404)
  if (conv.isTeamChat) {
    return c.json(
      createApiErrorResponse(ErrorCode.FORBIDDEN, 'Reading team chat content is not allowed'),
      403
    )
  }

  await db.insert(adminAccessLog).values({
    adminSub,
    adminEmail,
    resource: 'conversation',
    resourceId: id,
    action: 'read_messages',
    ip: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: c.req.header('user-agent'),
    metadata: reason ? { reason } : null,
  })

  const rows = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, id))
    .orderBy(asc(message.createdAt))
    .limit(500)

  const messages = rows.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    messageType: m.messageType,
    isDeleted: m.isDeleted,
    isEdited: m.isEdited,
    isPinned: m.isPinned,
    contentLength: m.content?.length ?? 0,
    createdAt: m.createdAt,
  }))

  return c.json({ conversation: conv, messages })
})

adminRoutes.get('/listing/stats', async (c) => {
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [
    [{ usersTotal }],
    [{ usersLast30 }],
    [{ usersPrev30 }],
    usersTrend,
    [{ orgsTotal }],
    [{ orgsLast30 }],
    [{ orgsPrev30 }],
    [{ requestsTotal }],
    [{ requestsLast30 }],
    [{ requestsPrev30 }],
    requestsTrend,
    requestsByStatus,
    [{ quotesTotal }],
    [{ quotesLast30 }],
    [{ quotesPrev30 }],
    quotesTrend,
    quotesByStatus,
    [{ convsTotal }],
    [{ convsDirect }],
    [{ convsTeam }],
    [{ subsActive }],
    subsByPlan,
    topOrgs,
    gmvAccepted,
    avgQuoteValue,
    timeToFirstQuote,
    stuckRequests,
    aiCallsLast30,
    aiTokensLast30,
    aiByFeature,
    aiTrend,
  ] = await Promise.all([
    db.select({ usersTotal: sql<number>`count(*)::int` }).from(user),
    db
      .select({ usersLast30: sql<number>`count(*)::int` })
      .from(user)
      .where(sql`${user.createdAt} >= ${d30}`),
    db
      .select({ usersPrev30: sql<number>`count(*)::int` })
      .from(user)
      .where(sql`${user.createdAt} >= ${d60} AND ${user.createdAt} < ${d30}`),
    db.execute(
      sql`SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count FROM "user" WHERE created_at >= ${d30} GROUP BY 1 ORDER BY 1`
    ),

    db.select({ orgsTotal: sql<number>`count(*)::int` }).from(organization),
    db
      .select({ orgsLast30: sql<number>`count(*)::int` })
      .from(organization)
      .where(sql`${organization.createdAt} >= ${d30}`),
    db
      .select({ orgsPrev30: sql<number>`count(*)::int` })
      .from(organization)
      .where(sql`${organization.createdAt} >= ${d60} AND ${organization.createdAt} < ${d30}`),

    db.select({ requestsTotal: sql<number>`count(*)::int` }).from(request),
    db
      .select({ requestsLast30: sql<number>`count(*)::int` })
      .from(request)
      .where(sql`${request.createdAt} >= ${d30}`),
    db
      .select({ requestsPrev30: sql<number>`count(*)::int` })
      .from(request)
      .where(sql`${request.createdAt} >= ${d60} AND ${request.createdAt} < ${d30}`),
    db.execute(
      sql`SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count FROM "request" WHERE created_at >= ${d30} GROUP BY 1 ORDER BY 1`
    ),
    db.execute(
      sql`SELECT lifecycle_status AS "lifecycleStatus", count(*)::int AS count FROM "request" GROUP BY lifecycle_status ORDER BY count DESC`
    ),

    db.select({ quotesTotal: sql<number>`count(*)::int` }).from(quote),
    db
      .select({ quotesLast30: sql<number>`count(*)::int` })
      .from(quote)
      .where(sql`${quote.createdAt} >= ${d30}`),
    db
      .select({ quotesPrev30: sql<number>`count(*)::int` })
      .from(quote)
      .where(sql`${quote.createdAt} >= ${d60} AND ${quote.createdAt} < ${d30}`),
    db.execute(
      sql`SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS count FROM "quote" WHERE created_at >= ${d30} GROUP BY 1 ORDER BY 1`
    ),
    db.execute(
      sql`SELECT status, count(*)::int AS count FROM "quote" GROUP BY status ORDER BY count DESC`
    ),

    db.select({ convsTotal: sql<number>`count(*)::int` }).from(conversation),
    db
      .select({ convsDirect: sql<number>`count(*)::int` })
      .from(conversation)
      .where(sql`${conversation.isTeamChat} = false`),
    db
      .select({ convsTeam: sql<number>`count(*)::int` })
      .from(conversation)
      .where(sql`${conversation.isTeamChat} = true`),

    db
      .select({ subsActive: sql<number>`count(*)::int` })
      .from(subscription)
      .where(sql`${subscription.status} = 'active'`),
    db.execute(
      sql`SELECT plan, count(*)::int AS count FROM "subscription" WHERE status = 'active' GROUP BY plan`
    ),

    db.execute(sql`
      SELECT o.id, o.name, o.slug,
             count(r.id)::int AS requests_30d,
             count(distinct q.id)::int AS quotes_30d
      FROM "organization" o
      LEFT JOIN "request" r ON r.receiver_organization_id = o.id AND r.created_at >= ${d30}
      LEFT JOIN "quote" q ON q.organization_id = o.id AND q.created_at >= ${d30}
      GROUP BY o.id, o.name, o.slug
      HAVING count(r.id) > 0 OR count(distinct q.id) > 0
      ORDER BY requests_30d DESC, quotes_30d DESC
      LIMIT 5
    `),

    db.execute(sql`
      SELECT
        coalesce(sum((pricing->>'totalAmount')::numeric), 0)::float AS gmv_30d,
        count(*)::int AS invoice_count
      FROM "invoice"
      WHERE created_at >= ${d30}
    `),
    db.execute(sql`
      SELECT
        coalesce(avg((pricing->>'totalTTC')::numeric), 0)::float AS avg_value,
        coalesce((percentile_cont(0.5) WITHIN GROUP (ORDER BY (pricing->>'totalTTC')::numeric)), 0)::float AS median_value
      FROM "quote"
      WHERE created_at >= ${d30} AND pricing->>'totalTTC' IS NOT NULL
    `),
    db.execute(sql`
      WITH first_quotes AS (
        SELECT q.request_id, min(q.created_at) AS first_quote_at
        FROM "quote" q
        GROUP BY q.request_id
      )
      SELECT
        coalesce((percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (fq.first_quote_at - r.created_at)))), 0)::float AS median_seconds,
        coalesce((percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (fq.first_quote_at - r.created_at)))), 0)::float AS p90_seconds,
        count(*)::int AS quoted_requests
      FROM "request" r
      JOIN first_quotes fq ON fq.request_id = r.id
      WHERE r.created_at >= ${d30}
    `),
    db.execute(sql`
      SELECT r.id, r.req_number, r.requester_email, r.created_at,
             EXTRACT(EPOCH FROM (now() - r.created_at))::int AS age_seconds
      FROM "request" r
      LEFT JOIN "quote" q ON q.request_id = r.id
      WHERE r.lifecycle_status = 'open'
        AND q.id IS NULL
        AND r.created_at < now() - interval '24 hours'
      ORDER BY r.created_at ASC
      LIMIT 10
    `),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiUsageLog)
      .where(sql`${aiUsageLog.createdAt} >= ${d30}`),
    db
      .select({ tokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int` })
      .from(aiUsageLog)
      .where(sql`${aiUsageLog.createdAt} >= ${d30}`),
    db.execute(sql`
      SELECT feature, count(*)::int AS calls,
             coalesce(sum(total_tokens), 0)::int AS tokens,
             coalesce(avg(duration_ms), 0)::int AS avg_duration_ms,
             sum(CASE WHEN success THEN 0 ELSE 1 END)::int AS errors
      FROM "ai_usage_log"
      WHERE created_at >= ${d30}
      GROUP BY feature
      ORDER BY calls DESC
    `),
    db.execute(sql`
      SELECT date_trunc('day', created_at)::date AS day,
             count(*)::int AS calls,
             coalesce(sum(total_tokens), 0)::int AS tokens
      FROM "ai_usage_log"
      WHERE created_at >= ${d30}
      GROUP BY 1
      ORDER BY 1
    `),
  ])

  return c.json({
    users: {
      total: usersTotal,
      last30d: usersLast30,
      prev30d: usersPrev30,
      trend: usersTrend.rows,
    },
    organizations: { total: orgsTotal, last30d: orgsLast30, prev30d: orgsPrev30 },
    requests: {
      total: requestsTotal,
      last30d: requestsLast30,
      prev30d: requestsPrev30,
      trend: requestsTrend.rows,
      byLifecycleStatus: requestsByStatus.rows,
    },
    quotes: {
      total: quotesTotal,
      last30d: quotesLast30,
      prev30d: quotesPrev30,
      trend: quotesTrend.rows,
      byStatus: quotesByStatus.rows,
    },
    conversations: { total: convsTotal, direct: convsDirect, team: convsTeam },
    subscriptions: { active: subsActive, byPlan: subsByPlan.rows },
    topOrganizations: topOrgs.rows,
    business: {
      invoicedGmv30d: (gmvAccepted.rows[0] as { gmv_30d: number })?.gmv_30d ?? 0,
      invoicesCreated30d: (gmvAccepted.rows[0] as { invoice_count: number })?.invoice_count ?? 0,
      avgQuoteValue30d: (avgQuoteValue.rows[0] as { avg_value: number })?.avg_value ?? 0,
      medianQuoteValue30d: (avgQuoteValue.rows[0] as { median_value: number })?.median_value ?? 0,
      timeToFirstQuote: {
        medianSeconds:
          (timeToFirstQuote.rows[0] as { median_seconds: number })?.median_seconds ?? 0,
        p90Seconds: (timeToFirstQuote.rows[0] as { p90_seconds: number })?.p90_seconds ?? 0,
        sampleSize: (timeToFirstQuote.rows[0] as { quoted_requests: number })?.quoted_requests ?? 0,
      },
      stuckRequests: stuckRequests.rows,
    },
    ai: {
      callsLast30d: aiCallsLast30[0]?.count ?? 0,
      tokensLast30d: aiTokensLast30[0]?.tokens ?? 0,
      byFeature: aiByFeature.rows,
      trend: aiTrend.rows,
    },
  })
})

adminRoutes.get('/actions/taxonomies', async (c) => {
  const [categories, services] = await Promise.all([
    db.select().from(category).orderBy(category.name),
    db.select().from(service).orderBy(service.name),
  ])
  return c.json({ categories, services })
})

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const SERVICE_TYPES = ['cargo', 'storage', 'logistics', 'port'] as const
type ServiceType = (typeof SERVICE_TYPES)[number]

function genId(): string {
  return crypto.randomUUID()
}

adminRoutes.post('/actions/taxonomies/categories', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { name?: string; slug?: string } | null
  const name = body?.name?.trim()
  if (!name) return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Missing name'), 400)
  const slug = body?.slug?.trim() || slugify(name)
  try {
    const [row] = await db.insert(category).values({ id: genId(), name, slug }).returning()
    return c.json({ category: row }, 201)
  } catch (err) {
    const e = err as { code?: string; message?: string }
    if (e.code === '23505')
      return c.json(createApiErrorResponse(ErrorCode.CONFLICT, 'Slug already exists'), 409)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create category'),
      500
    )
  }
})

adminRoutes.patch('/actions/taxonomies/categories/:id', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => null)) as { name?: string; slug?: string } | null
  if (!body) return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON'), 400)
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name) set.name = body.name.trim()
  if (body.slug) set.slug = body.slug.trim()
  const [row] = await db.update(category).set(set).where(eq(category.id, id)).returning()
  if (!row) return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Category not found'), 404)
  return c.json({ category: row })
})

adminRoutes.delete('/actions/taxonomies/categories/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const [row] = await db
      .delete(category)
      .where(eq(category.id, id))
      .returning({ id: category.id })
    if (!row) return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Category not found'), 404)
    return c.json({ deleted: true })
  } catch (err) {
    const e = err as { code?: string; message?: string }
    if (e.code === '23503')
      return c.json(
        createApiErrorResponse(ErrorCode.CONFLICT, 'Category is referenced by other rows'),
        409
      )
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete category'),
      500
    )
  }
})

adminRoutes.post('/actions/taxonomies/services', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: string
    slug?: string
    type?: string
  } | null
  const name = body?.name?.trim()
  const type = body?.type as ServiceType | undefined
  if (!name) return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Missing name'), 400)
  if (!type || !SERVICE_TYPES.includes(type)) {
    return c.json(
      createApiErrorResponse(
        ErrorCode.BAD_REQUEST,
        `Type must be one of: ${SERVICE_TYPES.join(', ')}`
      ),
      400
    )
  }
  const slug = body?.slug?.trim() || slugify(name)
  try {
    const [row] = await db.insert(service).values({ id: genId(), name, slug, type }).returning()
    return c.json({ service: row }, 201)
  } catch (err) {
    const e = err as { code?: string; message?: string }
    if (e.code === '23505')
      return c.json(createApiErrorResponse(ErrorCode.CONFLICT, 'Slug already exists'), 409)
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create service'),
      500
    )
  }
})

adminRoutes.patch('/actions/taxonomies/services/:id', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => null)) as {
    name?: string
    slug?: string
    type?: string
  } | null
  if (!body) return c.json(createApiErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON'), 400)
  if (body.type && !SERVICE_TYPES.includes(body.type as ServiceType)) {
    return c.json(
      createApiErrorResponse(
        ErrorCode.BAD_REQUEST,
        `Type must be one of: ${SERVICE_TYPES.join(', ')}`
      ),
      400
    )
  }
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name) set.name = body.name.trim()
  if (body.slug) set.slug = body.slug.trim()
  if (body.type) set.type = body.type
  const [row] = await db.update(service).set(set).where(eq(service.id, id)).returning()
  if (!row) return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Service not found'), 404)
  return c.json({ service: row })
})

adminRoutes.delete('/actions/taxonomies/services/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const [row] = await db.delete(service).where(eq(service.id, id)).returning({ id: service.id })
    if (!row) return c.json(createApiErrorResponse(ErrorCode.NOT_FOUND, 'Service not found'), 404)
    return c.json({ deleted: true })
  } catch (err) {
    const e = err as { code?: string; message?: string }
    if (e.code === '23503')
      return c.json(
        createApiErrorResponse(ErrorCode.CONFLICT, 'Service is referenced by other rows'),
        409
      )
    return c.json(
      createApiErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete service'),
      500
    )
  }
})

export default adminRoutes
