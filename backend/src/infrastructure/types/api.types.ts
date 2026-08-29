export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  code: CommonApiErrorCode
  message: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

export interface PaginationQuery {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface IdParam {
  id: string
}

export interface OrganizationIdParam {
  organizationId: string
}

export interface CommonVariables {
  user?: { id: string; email: string; name: string; image: string | null; role: string } | null
  isAuthenticated?: boolean
  userId?: string
  organizationId?: string
  organization?: { id: string; name: string }
  membership?: { role: string; organizationId: string; organizationName: string }
}

export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UPSTREAM_UNAVAILABLE = 'UPSTREAM_UNAVAILABLE',
}

export type CommonApiErrorCode = `${ErrorCode}`

export const createApiErrorResponse = (
  code: CommonApiErrorCode,
  message: string,
  details?: unknown
): ApiErrorResponse => ({
  success: false,
  code,
  message,
  ...(details === undefined ? {} : { details }),
})

export const getApiErrorCodeForStatus = (status: number): CommonApiErrorCode => {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST
    case 401:
      return ErrorCode.UNAUTHORIZED
    case 402:
      return ErrorCode.PAYMENT_REQUIRED
    case 403:
      return ErrorCode.FORBIDDEN
    case 404:
      return ErrorCode.NOT_FOUND
    case 409:
      return ErrorCode.CONFLICT
    case 422:
      return ErrorCode.VALIDATION_ERROR
    case 429:
      return ErrorCode.RATE_LIMITED
    case 503:
      return ErrorCode.UPSTREAM_UNAVAILABLE
    default:
      return ErrorCode.INTERNAL_SERVER_ERROR
  }
}

export const createApiErrorResponseForStatus = (
  status: number,
  message: string,
  details?: unknown
): ApiErrorResponse => {
  return createApiErrorResponse(getApiErrorCodeForStatus(status), message, details)
}
