export class MessageReadMessageNotFoundError extends Error {
  constructor() {
    super('Message not found')
    this.name = 'MessageReadMessageNotFoundError'
  }
}

export class MessageReadConversationNotFoundError extends Error {
  constructor() {
    super('Conversation not found')
    this.name = 'MessageReadConversationNotFoundError'
  }
}

export class MessageReadOwnMessageError extends Error {
  constructor() {
    super('Cannot mark own message as read')
    this.name = 'MessageReadOwnMessageError'
  }
}

export class MessageReadForbiddenError extends Error {
  constructor() {
    super('User is not part of this conversation')
    this.name = 'MessageReadForbiddenError'
  }
}
