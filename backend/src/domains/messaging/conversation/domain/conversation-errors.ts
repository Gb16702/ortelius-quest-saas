export class ConversationAccessDeniedError extends Error {
  constructor() {
    super('Forbidden')
    this.name = 'ConversationAccessDeniedError'
  }
}

export class ConversationMemberDmForbiddenError extends Error {
  constructor() {
    super('Members must belong to the same organization')
    this.name = 'ConversationMemberDmForbiddenError'
  }
}

export class ConversationMemberDmValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConversationMemberDmValidationError'
  }
}
