import * as v from "valibot"

export const timePeriodSchema = v.union([
    v.literal(7),
    v.literal(14),
    v.literal(30),
    v.literal(90),
    v.literal(365),
])

const aggregationItemSchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    count: v.number(),
    percentage: v.number(),
})

export const organizationRequestsAggregationSchema = v.looseObject({
    services: v.array(aggregationItemSchema),
    cargoTypes: v.array(aggregationItemSchema),
})

export const memberInfoSchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.nullable(v.string())),
    role: v.optional(v.string()),
})

export const organizationInfoSchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.nullable(v.string())),
})

export const memberMetricsSummarySchema = v.looseObject({
    requestsHandled: v.number(),
    quotesCreated: v.number(),
    invoicesCreated: v.number(),
    totalRevenue: v.number(),
    conversationsCount: v.number(),
    messagesCount: v.number(),
    averageDailyRequests: v.number(),
    averageDailyRevenue: v.number(),
    periodDays: v.number(),
})

export const memberDailyMetricsSchema = v.looseObject({
    date: v.string(),
    requestsHandled: v.number(),
    quotesCreated: v.number(),
    invoicesCreated: v.number(),
    revenue: v.number(),
    messagesCount: v.number(),
})

const memberMetricsRecordSchema = v.looseObject({
    id: v.string(),
    userId: v.string(),
    organizationId: v.string(),
    requestsHandled: v.number(),
    quotesCreated: v.number(),
    invoicesCreated: v.number(),
    totalRevenue: v.number(),
    conversationsCount: v.number(),
    messagesCount: v.number(),
    updatedAt: v.string(),
    createdAt: v.string(),
})

export const memberMetricsResponseSchema = v.looseObject({
    member: memberInfoSchema,
    organization: v.optional(organizationInfoSchema),
    metrics: v.nullable(memberMetricsRecordSchema),
    dailyMetrics: v.array(
        v.object({
            .../*@valibot-migrate we can't detect if memberDailyMetricsSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
            memberDailyMetricsSchema.entries,

            id: v.string(),
            userId: v.string(),
            organizationId: v.string(),
            createdAt: v.string(),
        })
    ),
})

export const combinedMemberMetricsDataSchema = v.looseObject({
    memberMetricsSummary: memberMetricsSummarySchema,
    memberDailyMetrics: v.array(memberDailyMetricsSchema),
})

export const organizationMetricsSummarySchema = v.looseObject({
    totalRequests: v.number(),
    totalNewVisitors: v.number(),
    totalQuotes: v.number(),
    totalInvoices: v.number(),
    totalRevenue: v.number(),
    averageDailyRequests: v.number(),
    averageDailyNewVisitors: v.number(),
    averageDailyRevenue: v.number(),
    periodDays: v.number(),
})

export const organizationDailyMetricsSchema = v.looseObject({
    date: v.string(),
    requestsReceived: v.number(),
    newVisitors: v.number(),
    quotesGenerated: v.number(),
    invoicesCreated: v.number(),
    revenue: v.number(),
})

export const combinedOrganizationMetricsDataSchema = v.looseObject({
    organizationMetricsSummary: organizationMetricsSummarySchema,
    organizationDailyMetrics: v.array(organizationDailyMetricsSchema),
})

export const organizationMetricsResponseSchema = v.looseObject({
    organization: organizationInfoSchema,
    metrics: organizationMetricsSummarySchema,
    dailyMetrics: v.array(organizationDailyMetricsSchema),
})

export type TimePeriod = v.InferOutput<typeof timePeriodSchema>
export type OrganizationRequestsAggregation = v.InferOutput<
    typeof organizationRequestsAggregationSchema
>
export type MemberMetricsResponse = v.InferOutput<typeof memberMetricsResponseSchema>
export type MemberMetricsSummary = v.InferOutput<typeof memberMetricsSummarySchema>
export type MemberDailyMetrics = v.InferOutput<typeof memberDailyMetricsSchema>
export type CombinedMemberMetricsData = v.InferOutput<typeof combinedMemberMetricsDataSchema>
export type OrganizationMetricsResponse = v.InferOutput<typeof organizationMetricsResponseSchema>
export type OrganizationMetricsSummary = v.InferOutput<typeof organizationMetricsSummarySchema>
export type OrganizationDailyMetrics = v.InferOutput<typeof organizationDailyMetricsSchema>
export type CombinedOrganizationMetricsData = v.InferOutput<
    typeof combinedOrganizationMetricsDataSchema
>
