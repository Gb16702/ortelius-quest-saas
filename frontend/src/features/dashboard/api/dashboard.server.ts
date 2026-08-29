import * as v from "valibot"
import {
    createGraphQLApiError,
    type GraphQLErrorPayload,
    type GraphQLRequest,
    type GraphQLResponse,
    isGraphQLError,
} from "@/shared/api/graphql"
import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import type { TimePeriod } from "../model/dashboard"
import {
    combinedMemberMetricsDataSchema,
    combinedOrganizationMetricsDataSchema,
} from "../model/schemas/dashboard.schema"
import {
    createMemberMetricsQueryData,
    createOrganizationMetricsQueryData,
    type MemberMetricsQueryData,
    type OrganizationMetricsQueryData,
} from "./dashboard.query-options"
import {
    COMBINED_MEMBER_METRICS_QUERY,
    COMBINED_ORGANIZATION_METRICS_QUERY,
} from "./graphql.queries"

const graphQLErrorSchema: v.GenericSchema<unknown, GraphQLErrorPayload> = v.looseObject({
    message: v.pipe(v.string(), v.minLength(1)),
    locations: v.optional(
        v.array(
            v.looseObject({
                line: v.number(),
                column: v.number(),
            })
        )
    ),
    path: v.optional(v.array(v.union([v.string(), v.number()]))),
    extensions: v.optional(v.record(v.string(), v.unknown())),
})

const graphQLResponseSchema: v.GenericSchema<unknown, GraphQLResponse<unknown>> = v.pipe(
    v.looseObject({
        data: v.optional(v.unknown()),
        errors: v.optional(v.array(graphQLErrorSchema)),
    }),
    v.check((response) => "data" in response || "errors" in response)
)

async function graphqlQueryDataServer<T>(
    request: GraphQLRequest,
    accessToken: string,
    schema: v.GenericSchema<unknown, T>
): Promise<T> {
    const response = await fetch(`${serverEnv.API_URL}/api/graphql`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
    })

    const graphQLResponse = v.parse(graphQLResponseSchema, await readJsonResponse(response))

    if (!response.ok && isGraphQLError(graphQLResponse)) {
        throw createGraphQLApiError(graphQLResponse, response.status)
    }

    if (!response.ok) {
        throw new Error(`GraphQL request failed with status ${response.status}`)
    }

    if (isGraphQLError(graphQLResponse)) {
        throw createGraphQLApiError(graphQLResponse)
    }

    return parseSchema(schema, graphQLResponse.data)
}

export async function fetchMemberMetricsServer(
    userId: string,
    organizationSlug: string,
    accessToken: string,
    days: TimePeriod
): Promise<MemberMetricsQueryData> {
    const data = await graphqlQueryDataServer(
        {
            query: COMBINED_MEMBER_METRICS_QUERY,
            variables: { userId, organizationSlug, days: days * 2 },
        },
        accessToken,
        combinedMemberMetricsDataSchema
    )

    return createMemberMetricsQueryData(data)
}

export async function fetchOrganizationMetricsServer(
    organizationSlug: string,
    accessToken: string,
    days: TimePeriod
): Promise<OrganizationMetricsQueryData> {
    const data = await graphqlQueryDataServer(
        {
            query: COMBINED_ORGANIZATION_METRICS_QUERY,
            variables: { slug: organizationSlug, summaryDays: days, dailyDays: days * 2 },
        },
        accessToken,
        combinedOrganizationMetricsDataSchema
    )

    return createOrganizationMetricsQueryData(data)
}
