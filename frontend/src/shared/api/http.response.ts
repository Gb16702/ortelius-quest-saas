import * as v from "valibot"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"

export const COMMON_API_ERROR_CODES = [
    "BAD_REQUEST",
    "VALIDATION_ERROR",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "CONFLICT",
    "PAYLOAD_TOO_LARGE",
    "RATE_LIMITED",
    "INTERNAL_SERVER_ERROR",
    "UPSTREAM_UNAVAILABLE",
] as const

export type CommonApiErrorCode = (typeof COMMON_API_ERROR_CODES)[number]

export interface ApiErrorPayload {
    success: false
    code: string
    message: string
    details?: unknown
}

export const apiErrorPayloadSchema = v.object({
    success: v.literal(false),
    code: v.optional(v.pipe(v.string(), v.minLength(1))),
    message: v.pipe(v.string(), v.minLength(1)),
    details: v.optional(v.unknown()),
})

export interface ApiErrorDetails {
    status: number
    code?: string
    message: string
    payload?: unknown
}

export class ApiError extends Error {
    status: number
    code?: string
    payload?: unknown

    constructor({ status, code, message, payload }: ApiErrorDetails) {
        super(message)
        this.name = "ApiError"
        this.status = status
        this.code = code
        this.payload = payload
    }
}

export async function readJsonResponse(response: Response): Promise<unknown> {
    const text = await response.text().catch(() => "")
    if (text.trim() === "") return null

    try {
        return JSON.parse(text) as unknown
    } catch {
        return null
    }
}

export function getDefaultApiErrorCode(status: number): CommonApiErrorCode {
    if (status === 401) return "UNAUTHORIZED"
    if (status === 403) return "FORBIDDEN"
    if (status === 404) return "NOT_FOUND"
    if (status === 405) return "METHOD_NOT_ALLOWED"
    if (status === 409) return "CONFLICT"
    if (status === 413) return "PAYLOAD_TOO_LARGE"
    if (status === 422) return "VALIDATION_ERROR"
    if (status === 429) return "RATE_LIMITED"
    if (status === 502 || status === 503 || status === 504) return "UPSTREAM_UNAVAILABLE"
    if (status >= 500) return "INTERNAL_SERVER_ERROR"
    return "BAD_REQUEST"
}

export function getDefaultApiErrorMessage(status: number): string {
    if (status === 401) return "Authentication required"
    if (status === 403) return "Insufficient permissions"
    if (status === 404) return "Resource not found"
    if (status === 405) return "Method not allowed"
    if (status === 409) return "Resource conflict"
    if (status === 413) return "Payload too large"
    if (status === 422) return "Validation failed"
    if (status === 429) return "Too many requests"
    if (status === 502 || status === 503 || status === 504) return "Upstream API unavailable"
    if (status >= 500) return "An internal server error occurred"
    return "Bad request"
}

function normalizeBackendErrorCode(code: string | undefined, status: number): string {
    if (!code) return getDefaultApiErrorCode(status)
    if (code === "INTERNAL_ERROR") return "INTERNAL_SERVER_ERROR"
    return code
}

export function getResponseErrorMessage(payload: unknown, fallback: string): string {
    const standardResult = safeParseSchema(apiErrorPayloadSchema, payload)
    if (standardResult.success) return standardResult.data.message

    return fallback
}

export function normalizeApiErrorPayload(
    status: number,
    payload: unknown,
    fallback = getDefaultApiErrorMessage(status)
): ApiErrorPayload {
    const standardResult = safeParseSchema(apiErrorPayloadSchema, payload)
    if (standardResult.success) {
        return {
            ...standardResult.data,
            code: normalizeBackendErrorCode(standardResult.data.code, status),
        }
    }

    return {
        success: false,
        code: getDefaultApiErrorCode(status),
        message: fallback,
    }
}

export function createApiError(status: number, payload: unknown, fallback: string): ApiError {
    const error = normalizeApiErrorPayload(status, payload, fallback)

    return new ApiError({
        status,
        code: error.code,
        message: error.message,
        payload: error,
    })
}

export function assertSuccessfulResponse(payload: unknown, fallback: string, status = 200): void {
    const result = safeParseSchema(apiErrorPayloadSchema, payload)
    if (!result.success) return
    throw createApiError(status, payload, fallback)
}

export function parseEnvelopeData<TSchema extends v.GenericSchema>(
    schema: TSchema,
    payload: unknown
): v.InferOutput<TSchema> {
    const envelopeResult = safeParseSchema(
        v.looseObject({
            data: schema,
        }),
        payload
    )

    if (envelopeResult.success) {
        return envelopeResult.data.data
    }

    return parseSchema(schema, payload)
}

export async function parseJsonResponse<TSchema extends v.GenericSchema>(
    response: Response,
    schema: TSchema,
    fallbackErrorMessage: string
): Promise<v.InferOutput<TSchema>> {
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw createApiError(response.status, payload, fallbackErrorMessage)
    }

    assertSuccessfulResponse(payload, fallbackErrorMessage, response.status)
    return parseSchema(schema, payload)
}

export async function parseEmptySuccessResponse(
    response: Response,
    fallbackErrorMessage: string
): Promise<void> {
    const payload = await readJsonResponse(response)

    if (!response.ok) {
        throw createApiError(response.status, payload, fallbackErrorMessage)
    }

    assertSuccessfulResponse(payload, fallbackErrorMessage, response.status)
}
