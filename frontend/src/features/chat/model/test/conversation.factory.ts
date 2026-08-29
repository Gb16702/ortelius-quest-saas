import {
    TEST_ORG_ID,
    TEST_ORG_NAME,
    TEST_USER_ID,
    TEST_USER_NAME,
} from "@/shared/test/fixtures/identity"
import type { Conversation } from "../schemas/chats.schema"
import { createMessage } from "./message.factory"

type RequesterConversation = Extract<Conversation, { conversationType: "requester" }>
type MemberDmConversation = Extract<Conversation, { conversationType: "member_dm" }>
type TeamConversation = Extract<Conversation, { conversationType: "team" }>

type ConversationLastMessage = RequesterConversation["lastMessage"]

function pickLastMessage(): ConversationLastMessage {
    const message = createMessage({ content: "Welcome to the chat" })
    return {
        id: message.id,
        content: message.content,
        messageType: message.messageType,
        senderId: message.senderId,
        senderName: message.senderName,
        createdAt: message.createdAt,
        isUnread: false,
        metadata: message.metadata,
    }
}

export function createConversation(
    overrides: Partial<RequesterConversation> = {}
): RequesterConversation {
    return {
        id: "conversation-1",
        name: TEST_ORG_NAME,
        lastMessage: pickLastMessage(),
        messageCount: 1,
        participants: [{ id: TEST_USER_ID, name: TEST_USER_NAME, image: null }],
        updatedAt: "2026-05-15T00:00:00.000Z",
        contextInfo: {
            type: "organization",
            id: TEST_ORG_ID,
            name: TEST_ORG_NAME,
            logo: null,
        },
        isPinned: false,
        pinnedAt: null,
        conversationType: "requester",
        isTeamChat: false,
        ...overrides,
    }
}

export function createTeamConversation(
    overrides: Partial<Omit<TeamConversation, "isTeamChat">> = {}
): TeamConversation {
    return {
        ...(createConversation() as Omit<RequesterConversation, "isTeamChat" | "conversationType">),
        conversationType: "team",
        isTeamChat: true,
        organizationId: TEST_ORG_ID,
        ...overrides,
    }
}

export function createMemberDmConversation(
    overrides: Partial<MemberDmConversation> = {}
): MemberDmConversation {
    return {
        ...createConversation(),
        conversationType: "member_dm",
        isTeamChat: false,
        ...overrides,
    }
}
