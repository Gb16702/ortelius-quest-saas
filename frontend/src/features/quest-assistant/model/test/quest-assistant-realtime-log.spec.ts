import { afterEach, describe, expect, it } from "bun:test"
import type { AssistantAttachment, AssistantSyncAction } from "../quest-assistant"
import {
    createAssistantPromptProjectionPart,
    createQuestAssistantRealtimeConversationTombstone,
    createQuestAssistantRealtimeDatabaseName,
    createQuestAssistantRealtimeDatabaseNameForRegistryRecord,
    createQuestAssistantRealtimeDatabaseRegistryRecord,
    createQuestAssistantRealtimeStoredEvent,
    filterQuestAssistantRealtimeDeletedProjection,
    getQuestAssistantRealtimeDatabaseRegistryLookupKey,
    getQuestAssistantSyncActionWriteStatus,
    mergeAssistantProjectionParts,
    type QuestAssistantRealtimeMetadata,
    type QuestAssistantRealtimeProjection,
    recordQuestAssistantConversationOptimisticDeletion,
    recordQuestAssistantSyncAction,
    shouldResetQuestAssistantRealtimeProjectionCache,
} from "../quest-assistant-realtime-log.client"

const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB")

afterEach(() => {
    if (originalIndexedDbDescriptor) {
        Object.defineProperty(globalThis, "indexedDB", originalIndexedDbDescriptor)
        return
    }

    Reflect.deleteProperty(globalThis, "indexedDB")
})

const syncAction = {
    syncId: 3,
    userId: "user-1",
    organizationId: "org-1",
    conversationId: "conversation-1",
    modelName: "assistant_action",
    modelId: "action-1",
    operation: "update",
    payload: {
        type: "action_updated",
        action: {
            id: "action-1",
            conversationId: "conversation-1",
            userId: "user-1",
            organizationId: "org-1",
            type: "open_page",
            status: "cancelled",
            title: "Open branding settings",
            summary: "Go to the page where organization brand details are managed.",
            buttonLabel: "Open page",
            riskLevel: "low",
            requiresConfirmation: true,
            payload: { routePath: "/org/acme/settings/branding" },
            preview: { routePath: "/org/acme/settings/branding" },
            result: null,
            errorMessage: null,
            expiresAt: "2026-06-11T12:10:00.000Z",
            confirmedAt: null,
            executedAt: null,
            cancelledAt: "2026-06-11T12:05:00.000Z",
            createdAt: "2026-06-11T12:00:00.000Z",
            updatedAt: "2026-06-11T12:05:00.000Z",
        },
    },
    createdAt: "2026-06-11T12:00:00.000Z",
} satisfies AssistantSyncAction

function createSyncMetadata(input: { lastSyncId: number }): QuestAssistantRealtimeMetadata {
    return {
        id: "sync",
        userId: "user-1",
        firstSyncId: input.lastSyncId > 0 ? 1 : 0,
        lastSyncId: input.lastSyncId,
        schemaVersion: 9,
        updatedAt: "2026-06-11T12:05:00.000Z",
    }
}

function createRealtimeProjection(input: {
    deletedConversations?: QuestAssistantRealtimeProjection["deletedConversations"]
    metadata: QuestAssistantRealtimeMetadata
}): QuestAssistantRealtimeProjection {
    return {
        actions: [],
        conversationProjections: [],
        deletedConversations: input.deletedConversations ?? [],
        meta: input.metadata,
    }
}

describe("quest assistant realtime log", () => {
    it("names the local assistant database by cache id", () => {
        expect(createQuestAssistantRealtimeDatabaseName("cec0a36ab5a1e1a16cdaebbfb61761af")).toBe(
            "quest_cec0a36ab5a1e1a16cdaebbfb61761af"
        )
    })

    it("creates deterministic Linear-like local assistant database names for registry records", async () => {
        const databaseName = await createQuestAssistantRealtimeDatabaseNameForRegistryRecord({
            userId: "user-1",
        })
        const matchingDatabaseName =
            await createQuestAssistantRealtimeDatabaseNameForRegistryRecord({
                userId: "user-1",
            })
        const otherUserDatabaseName =
            await createQuestAssistantRealtimeDatabaseNameForRegistryRecord({
                userId: "user-2",
            })

        expect(databaseName).toMatch(/^quest_[a-f0-9]{32}$/)
        expect(matchingDatabaseName).toBe(databaseName)
        expect(otherUserDatabaseName).not.toBe(databaseName)
    })

    it("creates Linear-like database registry records with a schema lookup key", () => {
        const record = createQuestAssistantRealtimeDatabaseRegistryRecord({
            createdAt: 1781369985464,
            name: "quest_cec0a36ab5a1e1a16cdaebbfb61761af",
            userId: "user-1",
        })

        expect(record).toEqual({
            createdAt: 1781369985464,
            name: "quest_cec0a36ab5a1e1a16cdaebbfb61761af",
            schemaHash: expect.stringMatching(/^[a-f0-9]{32}$/),
            schemaVersion: 9,
            userId: "user-1",
            userVersion: null,
            version: 1,
        })
        expect(getQuestAssistantRealtimeDatabaseRegistryLookupKey("user-1")).toEqual([
            "user-1",
            record.schemaHash,
            record.schemaVersion,
            record.version,
        ])
    })

    it("resets a local projection cache when the durable cursor advanced but projections are empty", () => {
        const metadata = createSyncMetadata({ lastSyncId: 36 })
        const projection = createRealtimeProjection({ metadata })

        expect(
            shouldResetQuestAssistantRealtimeProjectionCache({
                metadata,
                projection,
            })
        ).toBe(true)
    })

    it("does not reset an empty local projection cache before the first sync action", () => {
        const metadata = createSyncMetadata({ lastSyncId: 0 })
        const projection = createRealtimeProjection({ metadata })

        expect(
            shouldResetQuestAssistantRealtimeProjectionCache({
                metadata,
                projection,
            })
        ).toBe(false)
    })

    it("does not reset a local projection cache that has delete tombstones", () => {
        const metadata = createSyncMetadata({ lastSyncId: 36 })
        const projection = createRealtimeProjection({
            deletedConversations: [
                createQuestAssistantRealtimeConversationTombstone({
                    userId: "user-1",
                    conversationId: "conversation-1",
                    deletedAt: "2026-06-11T12:05:00.000Z",
                    syncId: 36,
                    source: "server",
                    updatedAt: "2026-06-11T12:05:01.000Z",
                }),
            ],
            metadata,
        })

        expect(
            shouldResetQuestAssistantRealtimeProjectionCache({
                metadata,
                projection,
            })
        ).toBe(false)
    })

    it("scopes stored sync actions by user and sync id", () => {
        const record = createQuestAssistantRealtimeStoredEvent({
            userId: "user-1",
            syncAction,
            receivedAt: "2026-06-11T12:06:00.000Z",
        })

        expect(record).toEqual({
            id: "user-1:3",
            userId: "user-1",
            syncId: 3,
            conversationId: "conversation-1",
            organizationId: "org-1",
            modelName: "assistant_action",
            modelId: "action-1",
            operation: "update",
            timestamp: "2026-06-11T12:00:00.000Z",
            receivedAt: "2026-06-11T12:06:00.000Z",
            event: syncAction.payload,
        })
    })

    it("does not block live updates when IndexedDB is unavailable", async () => {
        Object.defineProperty(globalThis, "indexedDB", {
            configurable: true,
            value: undefined,
        })

        await expect(
            recordQuestAssistantSyncAction({
                userId: "user-1",
                syncAction,
            })
        ).resolves.toEqual({ status: "unavailable" })
    })

    it("does not block optimistic deletion when IndexedDB is unavailable", async () => {
        Object.defineProperty(globalThis, "indexedDB", {
            configurable: true,
            value: undefined,
        })

        await expect(
            recordQuestAssistantConversationOptimisticDeletion({
                userId: "user-1",
                conversationId: "conversation-1",
            })
        ).resolves.toEqual({ status: "unavailable" })
    })

    it("creates scoped conversation tombstones", () => {
        expect(
            createQuestAssistantRealtimeConversationTombstone({
                userId: "user-1",
                conversationId: "conversation-1",
                deletedAt: "2026-06-11T12:05:00.000Z",
                syncId: 4,
                source: "server",
                updatedAt: "2026-06-11T12:05:01.000Z",
            })
        ).toEqual({
            id: "user-1:conversation-1",
            userId: "user-1",
            conversationId: "conversation-1",
            deletedAt: "2026-06-11T12:05:00.000Z",
            syncId: 4,
            source: "server",
            updatedAt: "2026-06-11T12:05:01.000Z",
        })
    })

    it("filters deleted conversations from every derived projection", () => {
        const deletedConversations = [
            createQuestAssistantRealtimeConversationTombstone({
                userId: "user-1",
                conversationId: "conversation-1",
                deletedAt: "2026-06-11T12:05:00.000Z",
                syncId: 4,
                source: "server",
                updatedAt: "2026-06-11T12:05:01.000Z",
            }),
        ]

        const filteredProjection = filterQuestAssistantRealtimeDeletedProjection({
            deletedConversations,
            actions: [
                {
                    id: "action-1",
                    conversationId: "conversation-1",
                    userId: "user-1",
                    organizationId: "org-1",
                    type: "open_page",
                    status: "proposed",
                    title: "Deleted action",
                    summary: "Removed with deleted conversation",
                    buttonLabel: "Open",
                    riskLevel: "low",
                    requiresConfirmation: true,
                    payload: {},
                    preview: null,
                    result: null,
                    errorMessage: null,
                    expiresAt: "2026-06-11T12:10:00.000Z",
                    confirmedAt: null,
                    executedAt: null,
                    cancelledAt: null,
                    createdAt: "2026-06-11T12:00:00.000Z",
                    updatedAt: "2026-06-11T12:00:00.000Z",
                },
                {
                    id: "action-2",
                    conversationId: "conversation-2",
                    userId: "user-1",
                    organizationId: "org-1",
                    type: "open_page",
                    status: "proposed",
                    title: "Active action",
                    summary: "Still visible",
                    buttonLabel: "Open",
                    riskLevel: "low",
                    requiresConfirmation: true,
                    payload: {},
                    preview: null,
                    result: null,
                    errorMessage: null,
                    expiresAt: "2026-06-11T12:10:00.000Z",
                    confirmedAt: null,
                    executedAt: null,
                    cancelledAt: null,
                    createdAt: "2026-06-11T12:00:00.000Z",
                    updatedAt: "2026-06-11T12:00:00.000Z",
                },
            ],
            conversationProjections: [
                {
                    id: "conversation-1",
                    userId: "user-1",
                    organizationId: "org-1",
                    lastRoutePath: "/org/acme",
                    clientPlatform: "web",
                    context: [],
                    initialSource: "directChat",
                    status: "complete",
                    summary: "Deleted chat",
                    parts: [
                        {
                            id: "part-1",
                            runId: null,
                            type: "text",
                            role: "assistant",
                            status: "completed",
                            bodyData: {
                                type: "doc",
                                content: [
                                    {
                                        type: "paragraph",
                                        content: [{ type: "text", text: "Deleted" }],
                                    },
                                ],
                            },
                            createdAt: "2026-06-11T12:00:00.000Z",
                            updatedAt: "2026-06-11T12:00:01.000Z",
                        },
                    ],
                    pendingMessages: [],
                    readAt: null,
                    slugId: "conversation1",
                    createdAt: "2026-06-11T12:00:00.000Z",
                    updatedAt: "2026-06-11T12:04:00.000Z",
                },
                {
                    id: "conversation-2",
                    userId: "user-1",
                    organizationId: "org-1",
                    lastRoutePath: "/org/acme",
                    clientPlatform: "web",
                    context: [],
                    initialSource: "directChat",
                    status: "complete",
                    summary: "Active chat",
                    parts: [
                        {
                            id: "part-2",
                            runId: null,
                            type: "text",
                            role: "assistant",
                            status: "completed",
                            bodyData: {
                                type: "doc",
                                content: [
                                    {
                                        type: "paragraph",
                                        content: [{ type: "text", text: "Active" }],
                                    },
                                ],
                            },
                            createdAt: "2026-06-11T12:00:00.000Z",
                            updatedAt: "2026-06-11T12:00:01.000Z",
                        },
                    ],
                    pendingMessages: [],
                    readAt: null,
                    slugId: "conversation2",
                    createdAt: "2026-06-11T12:00:00.000Z",
                    updatedAt: "2026-06-11T12:04:00.000Z",
                },
            ],
        })

        expect(filteredProjection.actions.map((action) => action.id)).toEqual(["action-2"])
        expect(
            filteredProjection.conversationProjections.map((projection) => projection.id)
        ).toEqual(["conversation-2"])
        expect(
            filteredProjection.conversationProjections.flatMap((projection) => projection.parts)
        ).toEqual([expect.objectContaining({ id: "part-2" })])
    })

    it("accepts only contiguous sync ids after the local cursor", () => {
        expect(
            getQuestAssistantSyncActionWriteStatus({
                lastSyncId: 0,
                incomingSyncId: 1,
            })
        ).toBe("stored")
        expect(
            getQuestAssistantSyncActionWriteStatus({
                lastSyncId: 3,
                incomingSyncId: 4,
            })
        ).toBe("stored")
        expect(
            getQuestAssistantSyncActionWriteStatus({
                lastSyncId: 3,
                incomingSyncId: 3,
            })
        ).toBe("duplicate")
        expect(
            getQuestAssistantSyncActionWriteStatus({
                lastSyncId: 3,
                incomingSyncId: 5,
            })
        ).toBe("gap")
    })

    it("orders projection parts by timestamps without storing local order", () => {
        const parts = mergeAssistantProjectionParts(
            [
                {
                    id: "assistant-first",
                    runId: null,
                    type: "text",
                    role: "assistant",
                    status: "completed",
                    bodyData: {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                content: [{ type: "text", text: "First answer" }],
                            },
                        ],
                    },
                    createdAt: "2026-06-11T12:00:01.000Z",
                    updatedAt: "2026-06-11T12:00:02.000Z",
                },
            ],
            [
                createAssistantPromptProjectionPart({
                    userId: "user-1",
                    messageId: "user-second",
                    content: "Second prompt",
                    attachments: [],
                    createdAt: "2026-06-11T12:00:03.000Z",
                    runId: null,
                }),
            ]
        )

        expect(parts.map((part) => part.id)).toEqual(["assistant-first", "user-second"])
        expect(parts.some((part) => "order" in part)).toBe(false)
    })

    it("keeps image attachments in prompt projections without text", () => {
        const imageAttachment = {
            id: "attachment-1",
            userId: "user-1",
            organizationId: "org-1",
            conversationId: "conversation-1",
            messageId: null,
            filename: "assistant-attachments/user-1/logo.png",
            originalName: "logo.png",
            size: 1024,
            mimeType: "image/png",
            s3Key: "assistant-attachments/user-1/logo.png",
            url: "https://example.com/logo.png",
            downloadUrl: "https://example.com/logo-download.png",
            width: 128,
            height: 64,
            createdAt: "2026-06-11T12:00:00.000Z",
            updatedAt: "2026-06-11T12:00:00.000Z",
        } satisfies AssistantAttachment
        const part = createAssistantPromptProjectionPart({
            userId: "user-1",
            messageId: "message-1",
            content: "",
            attachments: [imageAttachment],
            createdAt: "2026-06-11T12:00:00.000Z",
            runId: null,
        })

        expect(part.bodyData?.content).toEqual([
            {
                type: "image",
                attrs: expect.objectContaining({
                    attachmentId: "attachment-1",
                    src: "https://example.com/logo.png",
                    title: "logo.png",
                    width: 128,
                    height: 64,
                }),
            },
        ])
    })
})
