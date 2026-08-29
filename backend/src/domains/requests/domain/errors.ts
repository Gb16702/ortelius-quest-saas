export type RequestDomainErrorCode =
  | 'REQUEST_NOT_FOUND'
  | 'INVALID_REQUEST_STATE'
  | 'INVALID_REQUEST_ASSIGNMENT'
  | 'REQUEST_CANCEL_FORBIDDEN'
  | 'REQUEST_ORGANIZATION_FORBIDDEN'
  | 'REQUEST_SHARE_FORBIDDEN'
  | 'REQUEST_TEAM_CHAT_NOT_FOUND'

export class RequestDomainError extends Error {
  constructor(
    message: string,
    public readonly code: RequestDomainErrorCode
  ) {
    super(message)
    this.name = 'RequestDomainError'
  }
}

export class RequestNotFoundError extends RequestDomainError {
  constructor(_requestId: string) {
    super('Request not found', 'REQUEST_NOT_FOUND')
    this.name = 'RequestNotFoundError'
  }
}

export class InvalidRequestStateError extends RequestDomainError {
  constructor(message: string) {
    super(message, 'INVALID_REQUEST_STATE')
    this.name = 'InvalidRequestStateError'
  }
}

export class InvalidRequestAssignmentError extends RequestDomainError {
  constructor(message: string) {
    super(message, 'INVALID_REQUEST_ASSIGNMENT')
    this.name = 'InvalidRequestAssignmentError'
  }
}

export class RequestCancelForbiddenError extends RequestDomainError {
  constructor() {
    super('Only the request owner can cancel this request', 'REQUEST_CANCEL_FORBIDDEN')
    this.name = 'RequestCancelForbiddenError'
  }
}

export class RequestShareForbiddenError extends RequestDomainError {
  constructor() {
    super('You must be a member of the organization to share requests', 'REQUEST_SHARE_FORBIDDEN')
    this.name = 'RequestShareForbiddenError'
  }
}

export class RequestOrganizationForbiddenError extends RequestDomainError {
  constructor(_organizationId: string) {
    super('You are not a member of the requested organization', 'REQUEST_ORGANIZATION_FORBIDDEN')
    this.name = 'RequestOrganizationForbiddenError'
  }
}

export class RequestTeamChatNotFoundError extends RequestDomainError {
  constructor(_organizationId: string) {
    super('Team chat not found for this organization', 'REQUEST_TEAM_CHAT_NOT_FOUND')
    this.name = 'RequestTeamChatNotFoundError'
  }
}
