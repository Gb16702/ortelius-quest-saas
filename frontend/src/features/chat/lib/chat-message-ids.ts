import type { MessageData } from "../model/chat"

export function getUserMessageIds(
    messages: readonly MessageData[],
    userId: string | undefined
): string[] {
    if (!userId) return []

    return messages
        .filter((message) => message.senderId === userId && message.messageType !== "system")
        .map((message) => message.id)
}

export function getReadStatusMessageIds(messages: readonly MessageData[]): string[] {
    return [...messages]
        .filter((message) => message.messageType !== "system")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((message) => message.id)
}
