import { describe, expect, it } from "bun:test"
import type { AssistantConversation } from "../quest-assistant"
import {
    getAssistantActiveConversationId,
    reconcileAssistantConversationList,
} from "../quest-assistant-conversation.state"

describe("getAssistantActiveConversationId", () => {
    it("does not resolve a deleted requested conversation as active", () => {
        expect(
            getAssistantActiveConversationId({
                selectedConversationId: null,
                requestedConversationId: "conversation-deleted",
                deletedConversationIds: new Set(["conversation-deleted"]),
            })
        ).toBeNull()
    })

    it("keeps the selected conversation active when it is not deleted", () => {
        expect(
            getAssistantActiveConversationId({
                selectedConversationId: "conversation-selected",
                requestedConversationId: "conversation-requested",
                deletedConversationIds: new Set(),
            })
        ).toBe("conversation-selected")
    })
})

describe("reconcileAssistantConversationList", () => {
    it("merges fetched conversations without replacing unchanged local rows", () => {
        const existingConversation = createAssistantConversation({
            id: "conversation-1",
            title: "Existing chat",
        })
        const localOnlyConversation = createAssistantConversation({
            id: "conversation-2",
            title: "Local chat",
        })
        const newFetchedConversation = createAssistantConversation({
            id: "conversation-3",
            title: "Fetched chat",
        })

        const conversations = reconcileAssistantConversationList({
            currentConversations: [existingConversation, localOnlyConversation],
            fetchedConversations: [
                newFetchedConversation,
                createAssistantConversation({
                    id: "conversation-1",
                    title: "Existing chat",
                }),
            ],
            deletedConversationIds: new Set(),
        })

        expect(conversations.map((conversation) => conversation.id)).toEqual([
            "conversation-3",
            "conversation-1",
            "conversation-2",
        ])
        expect(conversations[1]).toBe(existingConversation)
        expect(conversations[2]).toBe(localOnlyConversation)
    })

    it("filters tombstoned conversations from local and fetched snapshots", () => {
        const activeConversation = createAssistantConversation({
            id: "conversation-active",
            title: "Active chat",
        })
        const deletedConversation = createAssistantConversation({
            id: "conversation-deleted",
            title: "Deleted chat",
        })

        const conversations = reconcileAssistantConversationList({
            currentConversations: [deletedConversation, activeConversation],
            fetchedConversations: [deletedConversation, activeConversation],
            deletedConversationIds: new Set(["conversation-deleted"]),
        })

        expect(conversations).toEqual([activeConversation])
    })

    it("updates only rows whose backend snapshot changed", () => {
        const staleConversation = createAssistantConversation({
            id: "conversation-1",
            title: "Old title",
            updatedAt: "2026-06-11T12:00:00.000Z",
        })
        const unchangedConversation = createAssistantConversation({
            id: "conversation-2",
            title: "Stable title",
        })
        const updatedConversation = createAssistantConversation({
            id: "conversation-1",
            title: "New title",
            updatedAt: "2026-06-11T12:01:00.000Z",
        })

        const conversations = reconcileAssistantConversationList({
            currentConversations: [staleConversation, unchangedConversation],
            fetchedConversations: [
                updatedConversation,
                createAssistantConversation({
                    id: "conversation-2",
                    title: "Stable title",
                }),
            ],
            deletedConversationIds: new Set(),
        })

        expect(conversations).toEqual([updatedConversation, unchangedConversation])
        expect(conversations[0]).toBe(updatedConversation)
        expect(conversations[1]).toBe(unchangedConversation)
    })
})

function createAssistantConversation(
    overrides: Partial<AssistantConversation>
): AssistantConversation {
    return {
        id: "conversation-1",
        userId: "user-1",
        organizationId: "org-1",
        title: "Assistant chat",
        lastRoutePath: "/org/ortelius/requests",
        createdAt: "2026-06-11T12:00:00.000Z",
        updatedAt: "2026-06-11T12:00:00.000Z",
        ...overrides,
    }
}
