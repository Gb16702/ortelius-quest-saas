export interface RequestSystemMessageAdapterPort {
  createSystemMessage(data: {
    conversationId: string
    content: string
    senderId: string
    metadata?: Record<string, unknown>
  }): Promise<void>
}
