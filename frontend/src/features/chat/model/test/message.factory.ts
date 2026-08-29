import { TEST_USER_ID, TEST_USER_NAME } from "@/shared/test/fixtures/identity"
import type { MessageData } from "../schemas/chats.schema"

export function createMessage(overrides: Partial<MessageData> = {}): MessageData {
    return {
        id: "message-1",
        content: "Hello world",
        messageType: "text",
        senderId: TEST_USER_ID,
        senderName: TEST_USER_NAME,
        senderImage: null,
        organizationName: null,
        memberRole: null,
        metadata: undefined,
        replyTo: null,
        isEdited: false,
        isPinned: false,
        isDeleted: false,
        createdAt: "2026-05-15T00:00:00.000Z",
        updatedAt: "2026-05-15T00:00:00.000Z",
        ...overrides,
    }
}
