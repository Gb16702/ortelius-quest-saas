import * as v from "valibot"
import {
    type ApiError,
    COMMON_API_ERROR_CODES,
    createApiError,
    getDefaultApiErrorCode,
    readJsonResponse,
} from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"

const COMMON_API_ERROR_CODE_SET = new Set<string>(COMMON_API_ERROR_CODES)

const GRAPHQL_ERROR_CODE_STATUS = new Map<string, number>([
    ["BAD_REQUEST", 400],
    ["UNAUTHENTICATED", 401],
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["METHOD_NOT_ALLOWED", 405],
    ["CONFLICT", 409],
    ["PAYLOAD_TOO_LARGE", 413],
    ["BAD_USER_INPUT", 422],
    ["GRAPHQL_VALIDATION_FAILED", 422],
    ["VALIDATION_ERROR", 422],
    ["RATE_LIMITED", 429],
    ["INTERNAL_SERVER_ERROR", 500],
    ["UPSTREAM_UNAVAILABLE", 503],
])

const GRAPHQL_API_ERROR_CODE = new Map<string, string>([
    ["UNAUTHENTICATED", "UNAUTHORIZED"],
    ["BAD_USER_INPUT", "VALIDATION_ERROR"],
    ["GRAPHQL_VALIDATION_FAILED", "VALIDATION_ERROR"],
])

const graphQLErrorSchema = v.looseObject({
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

const graphQLResponseSchema = v.pipe(
    v.looseObject({
        data: v.optional(v.unknown()),
        errors: v.optional(v.array(graphQLErrorSchema)),
    }),
    v.check((response) => "data" in response || "errors" in response)
)

const messagePayloadSchema = v.looseObject({ message: v.pipe(v.string(), v.minLength(1)) })

export interface GraphQLErrorPayload {
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: Array<string | number>
    extensions?: Record<string, unknown>
}

export interface GraphQLResponse<T = unknown> {
    data?: T
    errors?: GraphQLErrorPayload[]
}

export interface GraphQLRequest {
    query: string
    variables?: Record<string, unknown>
    operationName?: string
}

type GraphQLErrorResponse = GraphQLResponse<unknown> & {
    errors: [GraphQLErrorPayload, ...GraphQLErrorPayload[]]
}

export async function graphqlQuery(request: GraphQLRequest): Promise<GraphQLResponse<unknown>> {
    const res = await fetch(`/api/graphql`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    })

    const json = await readJsonResponse(res)

    if (!res.ok) {
        const graphQLResponse = parseGraphQLResponse(json)
        if (graphQLResponse && isGraphQLError(graphQLResponse)) {
            throw createGraphQLApiError(graphQLResponse, res.status)
        }

        throw createApiError(res.status, json, getHttpGraphQLErrorMessage(res.status, json))
    }

    const graphQLResponse = parseGraphQLResponse(json)
    if (!graphQLResponse) {
        throw new Error("Invalid GraphQL response")
    }

    return graphQLResponse
}

export async function graphqlQueryData<T>(
    request: GraphQLRequest,
    schema: v.GenericSchema<unknown, T>
): Promise<T> {
    const response = await graphqlQuery(request)

    if (isGraphQLError(response)) {
        throw createGraphQLApiError(response)
    }

    return parseSchema(schema, response.data)
}

export function isGraphQLError(response: GraphQLResponse): response is GraphQLErrorResponse {
    return !!response.errors && response.errors.length > 0
}

export function getGraphQLErrorMessage(response: GraphQLResponse): string {
    if (response.errors && response.errors.length > 0) {
        return response.errors.map((e) => e.message).join(", ")
    }
    return "Unknown error occurred"
}

export function createGraphQLApiError(
    response: GraphQLErrorResponse,
    httpStatus?: number
): ApiError {
    const graphQLCode = getGraphQLErrorExtensionCode(response.errors[0])
    const status = httpStatus ?? getGraphQLErrorStatus(graphQLCode)
    const code = getGraphQLApiErrorCode(graphQLCode, status)
    const message = getGraphQLErrorMessage(response)

    return createApiError(
        status,
        {
            success: false,
            code,
            message,
            details: {
                errors: response.errors.map((error) => ({
                    message: error.message,
                    code: getGraphQLErrorExtensionCode(error),
                    locations: error.locations,
                    path: error.path,
                })),
            },
        },
        message
    )
}

function parseGraphQLResponse(value: unknown): GraphQLResponse<unknown> | null {
    const result = v.safeParse(graphQLResponseSchema, value)
    if (!result.success) return null

    return {
        data: result.output.data,
        errors: result.output.errors,
    }
}

function getGraphQLErrorExtensionCode(error: GraphQLErrorPayload): string | undefined {
    const code = error.extensions?.code
    return typeof code === "string" && code.length > 0 ? code : undefined
}

function getGraphQLErrorStatus(code: string | undefined): number {
    if (!code) return 500
    return GRAPHQL_ERROR_CODE_STATUS.get(code) ?? 500
}

function getGraphQLApiErrorCode(code: string | undefined, status: number): string {
    if (!code) return getDefaultApiErrorCode(status)

    const normalizedCode = GRAPHQL_API_ERROR_CODE.get(code) ?? code
    if (COMMON_API_ERROR_CODE_SET.has(normalizedCode)) return normalizedCode

    return getDefaultApiErrorCode(status)
}

function getHttpGraphQLErrorMessage(status: number, body: unknown): string {
    const fallback = `GraphQL request failed with status ${status}`

    const standardMessage = v.safeParse(messagePayloadSchema, body)
    if (standardMessage.success) return standardMessage.output.message

    const graphQLResponse = parseGraphQLResponse(body)
    if (graphQLResponse && isGraphQLError(graphQLResponse)) {
        return getGraphQLErrorMessage(graphQLResponse)
    }

    return fallback
}
