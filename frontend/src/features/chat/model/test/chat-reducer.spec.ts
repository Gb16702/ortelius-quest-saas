import { describe, expect, it } from "bun:test"
import type { Attachment, MessageData } from "../chat"
import {
    type ChatState,
    chatReducer,
    type DeletingMessage,
    type EditingMessage,
    initialChatState,
    type ReplyingTo,
} from "../chat.reducer"
import { createConversation } from "./conversation.factory"
import { createMessage } from "./message.factory"

function buildAttachment(overrides: Partial<Attachment> = {}): Attachment {
    return {
        id: "attachment-1",
        filename: "report.pdf",
        originalName: "Quarterly report.pdf",
        size: 1024,
        mimeType: "application/pdf",
        s3Key: "uploads/report.pdf",
        url: undefined,
        downloadUrl: undefined,
        uploadedAt: "2026-05-15T00:00:00.000Z",
        uploadedBy: "user-1",
        ...overrides,
    }
}

function buildState(overrides: Partial<ChatState> = {}): ChatState {
    return { ...initialChatState, ...overrides }
}

function buildReplyTo(target: MessageData): NonNullable<MessageData["replyTo"]> {
    return {
        id: target.id,
        senderId: target.senderId,
        senderName: target.senderName ?? "Sender",
        senderImage: target.senderImage ?? null,
        content: target.content,
        messageType: target.messageType,
        createdAt: target.createdAt,
        isDeleted: target.isDeleted,
    }
}

describe("chatReducer", () => {
    describe("SET_CONVERSATIONS", () => {
        it("replaces the conversations array with the action payload", () => {
            const conversation = createConversation({ id: "conversation-42" })
            const next = chatReducer(initialChatState, {
                type: "SET_CONVERSATIONS",
                conversations: [conversation],
            })

            expect(next.conversations).toEqual([conversation])
            expect(next).not.toBe(initialChatState)
        })
    })

    describe("SET_ALL_MESSAGES", () => {
        it("replaces the message list with the provided payload", () => {
            const message = createMessage({ id: "message-99" })
            const next = chatReducer(initialChatState, {
                type: "SET_ALL_MESSAGES",
                messages: [message],
            })

            expect(next.allMessages).toEqual([message])
            expect(next).not.toBe(initialChatState)
        })
    })

    describe("MERGE_MESSAGES", () => {
        it("appends only messages whose ids are not already present", () => {
            const existing = createMessage({ id: "message-1", content: "first" })
            const duplicate = createMessage({ id: "message-1", content: "duplicate" })
            const fresh = createMessage({ id: "message-2", content: "second" })
            const state = buildState({ allMessages: [existing] })

            const next = chatReducer(state, {
                type: "MERGE_MESSAGES",
                messages: [duplicate, fresh],
            })

            expect(next.allMessages).toEqual([existing, fresh])
            expect(next.allMessages[0]).toBe(existing)
            expect(next).not.toBe(state)
        })

        it("returns the same state reference when every incoming message id already exists", () => {
            const existing = createMessage({ id: "message-1" })
            const state = buildState({ allMessages: [existing] })

            const next = chatReducer(state, {
                type: "MERGE_MESSAGES",
                messages: [createMessage({ id: "message-1", content: "ignored" })],
            })

            expect(Object.is(next, state)).toBe(true)
        })

        it("returns the same state reference when given an empty payload", () => {
            const state = buildState({ allMessages: [createMessage()] })

            const next = chatReducer(state, { type: "MERGE_MESSAGES", messages: [] })

            expect(Object.is(next, state)).toBe(true)
        })
    })

    describe("ADD_MESSAGE", () => {
        it("appends the new message to the existing list", () => {
            const existing = createMessage({ id: "message-1" })
            const incoming = createMessage({ id: "message-2", content: "second" })
            const state = buildState({ allMessages: [existing] })

            const next = chatReducer(state, { type: "ADD_MESSAGE", message: incoming })

            expect(next.allMessages).toEqual([existing, incoming])
            expect(next).not.toBe(state)
        })
    })

    describe("UPDATE_MESSAGE", () => {
        it("preserves attachments when only the content is updated", () => {
            const attachment = buildAttachment()
            const target = createMessage({
                id: "message-1",
                content: "original",
                metadata: { attachments: [attachment] },
            })
            const state = buildState({ allMessages: [target] })

            const next = chatReducer(state, {
                type: "UPDATE_MESSAGE",
                messageId: "message-1",
                updates: { content: "edited", isEdited: true },
            })

            const updated = next.allMessages[0]
            expect(updated.content).toBe("edited")
            expect(updated.isEdited).toBe(true)
            expect(updated.metadata?.attachments).toEqual([attachment])
            expect(next).not.toBe(state)
        })

        it("propagates the new content into replies that reference the edited message", () => {
            const target = createMessage({ id: "message-1", content: "original" })
            const reply = createMessage({
                id: "message-2",
                content: "responding",
                replyTo: buildReplyTo(target),
            })
            const state = buildState({ allMessages: [target, reply] })

            const next = chatReducer(state, {
                type: "UPDATE_MESSAGE",
                messageId: "message-1",
                updates: { content: "edited" },
            })

            expect(next.allMessages[0].content).toBe("edited")
            expect(next.allMessages[1].replyTo?.content).toBe("edited")
        })

        it("does not touch replyTo.content when the update has no content key", () => {
            const target = createMessage({ id: "message-1", content: "original" })
            const reply = createMessage({
                id: "message-2",
                replyTo: buildReplyTo(target),
            })
            const state = buildState({ allMessages: [target, reply] })

            const next = chatReducer(state, {
                type: "UPDATE_MESSAGE",
                messageId: "message-1",
                updates: { isPinned: true },
            })

            expect(next.allMessages[0].isPinned).toBe(true)
            expect(next.allMessages[1].replyTo?.content).toBe("original")
        })

        it("returns the same state reference when the target message id is unknown", () => {
            const target = createMessage({ id: "message-1" })
            const state = buildState({ allMessages: [target] })

            const next = chatReducer(state, {
                type: "UPDATE_MESSAGE",
                messageId: "missing",
                updates: { content: "edited" },
            })

            expect(Object.is(next, state)).toBe(true)
        })
    })

    describe("DELETE_MESSAGE", () => {
        it("marks the target message as deleted while preserving list order", () => {
            const first = createMessage({ id: "message-1", content: "first" })
            const second = createMessage({ id: "message-2", content: "second" })
            const third = createMessage({ id: "message-3", content: "third" })
            const state = buildState({ allMessages: [first, second, third] })

            const next = chatReducer(state, { type: "DELETE_MESSAGE", messageId: "message-2" })

            expect(next.allMessages.map((message) => message.id)).toEqual([
                "message-1",
                "message-2",
                "message-3",
            ])
            expect(next.allMessages[1].isDeleted).toBe(true)
            expect(next.allMessages[1].content).toBe("second")
            expect(next).not.toBe(state)
        })

        it("cascades isDeleted to replies that reference the deleted message", () => {
            const target = createMessage({ id: "message-1" })
            const reply = createMessage({
                id: "message-2",
                replyTo: buildReplyTo(target),
            })
            const state = buildState({ allMessages: [target, reply] })

            const next = chatReducer(state, { type: "DELETE_MESSAGE", messageId: "message-1" })

            expect(next.allMessages[0].isDeleted).toBe(true)
            expect(next.allMessages[1].replyTo?.isDeleted).toBe(true)
        })

        it("returns the same state reference when the target is already deleted", () => {
            const target = createMessage({ id: "message-1", isDeleted: true })
            const state = buildState({ allMessages: [target] })

            const next = chatReducer(state, { type: "DELETE_MESSAGE", messageId: "message-1" })

            expect(Object.is(next, state)).toBe(true)
        })

        it("leaves message content unchanged when the target message id does not exist", () => {
            const existing = createMessage({ id: "message-1" })
            const state = buildState({ allMessages: [existing] })

            const next = chatReducer(state, { type: "DELETE_MESSAGE", messageId: "missing" })

            expect(next.allMessages).toEqual([existing])
            expect(next.allMessages[0].isDeleted).toBe(false)
        })
    })

    describe("MARK_CONVERSATION_READ", () => {
        it("clears isUnread when the conversation has an unread last message", () => {
            const conversation = createConversation({
                id: "conversation-1",
                lastMessage: {
                    id: "message-1",
                    content: "Welcome",
                    messageType: "text",
                    senderId: "user-1",
                    senderName: "Ada",
                    createdAt: "2026-05-15T00:00:00.000Z",
                    isUnread: true,
                    metadata: undefined,
                },
            })
            const state = buildState({ conversations: [conversation] })

            const next = chatReducer(state, {
                type: "MARK_CONVERSATION_READ",
                conversationId: "conversation-1",
            })

            expect(next.conversations[0].lastMessage?.isUnread).toBe(false)
            expect(next).not.toBe(state)
        })

        it("returns the same state reference when the last message is already read", () => {
            const conversation = createConversation({ id: "conversation-1" })
            const state = buildState({ conversations: [conversation] })

            const next = chatReducer(state, {
                type: "MARK_CONVERSATION_READ",
                conversationId: "conversation-1",
            })

            expect(Object.is(next, state)).toBe(true)
        })

        it("returns the same state reference when the conversation does not exist", () => {
            const state = buildState({ conversations: [createConversation()] })

            const next = chatReducer(state, {
                type: "MARK_CONVERSATION_READ",
                conversationId: "missing",
            })

            expect(Object.is(next, state)).toBe(true)
        })

        it("returns the same state reference when the conversation has no last message", () => {
            const conversation = createConversation({ id: "conversation-1", lastMessage: null })
            const state = buildState({ conversations: [conversation] })

            const next = chatReducer(state, {
                type: "MARK_CONVERSATION_READ",
                conversationId: "conversation-1",
            })

            expect(Object.is(next, state)).toBe(true)
        })
    })

    describe("loading flags", () => {
        it("sets isInitialLoading", () => {
            const next = chatReducer(initialChatState, {
                type: "SET_INITIAL_LOADING",
                loading: false,
            })
            expect(next.isInitialLoading).toBe(false)
            expect(next).not.toBe(initialChatState)
        })

        it("sets isSubmitting", () => {
            const next = chatReducer(initialChatState, {
                type: "SET_SUBMITTING",
                submitting: true,
            })
            expect(next.isSubmitting).toBe(true)
        })

        it("sets isUploadingFiles", () => {
            const next = chatReducer(initialChatState, {
                type: "SET_UPLOADING_FILES",
                uploading: true,
            })
            expect(next.isUploadingFiles).toBe(true)
        })

        it("sets isExporting", () => {
            const next = chatReducer(initialChatState, {
                type: "SET_EXPORTING",
                exporting: true,
            })
            expect(next.isExporting).toBe(true)
        })
    })

    describe("search dialog", () => {
        it("opens the search dialog", () => {
            const next = chatReducer(initialChatState, { type: "OPEN_SEARCH_DIALOG" })
            expect(next.isSearchDialogOpen).toBe(true)
        })

        it("closes the search dialog", () => {
            const state = buildState({ isSearchDialogOpen: true })
            const next = chatReducer(state, { type: "CLOSE_SEARCH_DIALOG" })
            expect(next.isSearchDialogOpen).toBe(false)
        })
    })

    describe("participants dialog", () => {
        it("opens the participants dialog", () => {
            const next = chatReducer(initialChatState, { type: "OPEN_PARTICIPANTS_DIALOG" })
            expect(next.isParticipantsDialogOpen).toBe(true)
        })

        it("closes the participants dialog", () => {
            const state = buildState({ isParticipantsDialogOpen: true })
            const next = chatReducer(state, { type: "CLOSE_PARTICIPANTS_DIALOG" })
            expect(next.isParticipantsDialogOpen).toBe(false)
        })
    })

    describe("selected files", () => {
        it("replaces the selected files list with SET_SELECTED_FILES", () => {
            const initialFile = new File(["a"], "a.txt", { type: "text/plain" })
            const replacement = new File(["b"], "b.txt", { type: "text/plain" })
            const state = buildState({ selectedFiles: [initialFile] })

            const next = chatReducer(state, {
                type: "SET_SELECTED_FILES",
                files: [replacement],
            })

            expect(next.selectedFiles).toEqual([replacement])
            expect(next.selectedFiles).not.toContain(initialFile)
        })

        it("appends files with ADD_SELECTED_FILES without mutating the previous array", () => {
            const initialFile = new File(["a"], "a.txt", { type: "text/plain" })
            const incoming = new File(["b"], "b.txt", { type: "text/plain" })
            const state = buildState({ selectedFiles: [initialFile] })

            const next = chatReducer(state, {
                type: "ADD_SELECTED_FILES",
                files: [incoming],
            })

            expect(next.selectedFiles).toEqual([initialFile, incoming])
            expect(state.selectedFiles).toEqual([initialFile])
            expect(next.selectedFiles).not.toBe(state.selectedFiles)
        })

        it("clears the selected files list with CLEAR_SELECTED_FILES", () => {
            const state = buildState({
                selectedFiles: [new File(["a"], "a.txt", { type: "text/plain" })],
            })

            const next = chatReducer(state, { type: "CLEAR_SELECTED_FILES" })

            expect(next.selectedFiles).toEqual([])
        })
    })

    describe("replyingTo lifecycle", () => {
        const replyingTo: ReplyingTo = {
            messageId: "message-1",
            content: "Quoted body",
            senderName: "Ada",
        }

        it("opens a reply with SET_REPLYING_TO", () => {
            const next = chatReducer(initialChatState, {
                type: "SET_REPLYING_TO",
                replyingTo,
            })
            expect(next.replyingTo).toEqual(replyingTo)
        })

        it("clears the reply with CLEAR_REPLYING_TO", () => {
            const state = buildState({ replyingTo })
            const next = chatReducer(state, { type: "CLEAR_REPLYING_TO" })
            expect(next.replyingTo).toBeNull()
        })

        it("accepts null via SET_REPLYING_TO", () => {
            const state = buildState({ replyingTo })
            const next = chatReducer(state, { type: "SET_REPLYING_TO", replyingTo: null })
            expect(next.replyingTo).toBeNull()
        })
    })

    describe("editingMessage lifecycle", () => {
        const editingMessage: EditingMessage = {
            messageId: "message-1",
            content: "Edit me",
        }

        it("opens an edit with SET_EDITING_MESSAGE", () => {
            const next = chatReducer(initialChatState, {
                type: "SET_EDITING_MESSAGE",
                editingMessage,
            })
            expect(next.editingMessage).toEqual(editingMessage)
        })

        it("clears the edit with CLEAR_EDITING_MESSAGE", () => {
            const state = buildState({ editingMessage })
            const next = chatReducer(state, { type: "CLEAR_EDITING_MESSAGE" })
            expect(next.editingMessage).toBeNull()
        })

        it("accepts null via SET_EDITING_MESSAGE", () => {
            const state = buildState({ editingMessage })
            const next = chatReducer(state, {
                type: "SET_EDITING_MESSAGE",
                editingMessage: null,
            })
            expect(next.editingMessage).toBeNull()
        })
    })

    describe("deletingMessage lifecycle", () => {
        const deletingMessage: DeletingMessage = {
            id: "message-1",
            content: "Delete me",
            senderName: "Ada",
            senderImage: null,
            createdAt: "2026-05-15T00:00:00.000Z",
        }

        it("opens the delete prompt with SET_DELETING_MESSAGE", () => {
            const next = chatReducer(initialChatState, {
                type: "SET_DELETING_MESSAGE",
                deletingMessage,
            })
            expect(next.deletingMessage).toEqual(deletingMessage)
        })

        it("clears the delete prompt with CLEAR_DELETING_MESSAGE", () => {
            const state = buildState({ deletingMessage })
            const next = chatReducer(state, { type: "CLEAR_DELETING_MESSAGE" })
            expect(next.deletingMessage).toBeNull()
        })

        it("accepts null via SET_DELETING_MESSAGE", () => {
            const state = buildState({ deletingMessage })
            const next = chatReducer(state, {
                type: "SET_DELETING_MESSAGE",
                deletingMessage: null,
            })
            expect(next.deletingMessage).toBeNull()
        })
    })

    describe("default branch", () => {
        it("returns the same state reference for an unknown action type", () => {
            const state = buildState({ allMessages: [createMessage()] })
            // @ts-expect-error - exercising the reducer's default branch with an unknown action type
            const next = chatReducer(state, { type: "UNKNOWN_ACTION" })
            expect(Object.is(next, state)).toBe(true)
        })
    })
})
