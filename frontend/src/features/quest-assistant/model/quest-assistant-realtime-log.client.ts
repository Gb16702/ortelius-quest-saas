import * as v from "valibot"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type {
    AssistantAction,
    AssistantAttachment,
    AssistantConversation,
    AssistantConversationPart,
    AssistantConversationProjection,
    AssistantConversationProjectionPart,
    AssistantMessage,
    AssistantSyncAction,
} from "./quest-assistant"
import {
    assistantActionSchema,
    assistantAttachmentSchema,
    assistantConversationProjectionSchema,
} from "./quest-assistant.schema"

const QUEST_ASSISTANT_REALTIME_DB_PREFIX = "quest"
const QUEST_ASSISTANT_REALTIME_DB_VERSION = 9
const QUEST_ASSISTANT_REALTIME_SCHEMA_HASH = "58f9c8e8f7f34b7fa327fe6f8e68ed4b"
const QUEST_ASSISTANT_REALTIME_DATABASE_RECORD_VERSION = 1
const QUEST_ASSISTANT_REALTIME_REGISTRY_DB_NAME = "quest_databases"
const QUEST_ASSISTANT_REALTIME_REGISTRY_DB_VERSION = 2
const QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE = "databases"
const QUEST_ASSISTANT_REALTIME_REGISTRY_BY_USER_SCHEMA_INDEX = "by-user-schema-version"
const QUEST_ASSISTANT_REALTIME_EVENTS_STORE = "events"
const QUEST_ASSISTANT_REALTIME_META_STORE = "_meta"
const QUEST_ASSISTANT_REALTIME_META_ID = "sync"
const QUEST_ASSISTANT_REALTIME_ACTIONS_STORE = "actions"
const QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE = "conversation-projections"
const QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE = "deleted-conversations"

const questAssistantRealtimeMetadataSchema = v.object({
    id: v.string(),
    userId: v.string(),
    lastSyncId: v.pipe(v.number(), v.integer(), v.minValue(0)),
    firstSyncId: v.pipe(v.number(), v.integer(), v.minValue(0)),
    schemaVersion: v.pipe(v.number(), v.integer(), v.minValue(1)),
    updatedAt: v.string(),
})

const questAssistantRealtimeActionProjectionSchema = v.object({
    id: v.string(),
    userId: v.string(),
    conversationId: v.string(),
    action: assistantActionSchema,
    updatedAt: v.string(),
})

const questAssistantRealtimeConversationTombstoneSchema = v.object({
    id: v.string(),
    userId: v.string(),
    conversationId: v.string(),
    deletedAt: v.pipe(v.string(), v.isoTimestamp()),
    syncId: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
    source: v.picklist(["optimistic", "server"]),
    updatedAt: v.string(),
})

const questAssistantRealtimeDatabaseRegistryRecordSchema = v.object({
    createdAt: v.number(),
    name: v.string(),
    schemaHash: v.string(),
    schemaVersion: v.pipe(v.number(), v.integer(), v.minValue(1)),
    userId: v.string(),
    userVersion: v.nullable(v.string()),
    version: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export type QuestAssistantRealtimeMetadata = v.InferOutput<
    typeof questAssistantRealtimeMetadataSchema
>
type QuestAssistantRealtimeActionProjectionRecord = v.InferOutput<
    typeof questAssistantRealtimeActionProjectionSchema
>
export type QuestAssistantRealtimeConversationTombstone = v.InferOutput<
    typeof questAssistantRealtimeConversationTombstoneSchema
>
type QuestAssistantRealtimeDatabaseRegistryRecord = v.InferOutput<
    typeof questAssistantRealtimeDatabaseRegistryRecordSchema
>

export type QuestAssistantRealtimeRecordStatus =
    | "stored"
    | "duplicate"
    | "gap"
    | "unavailable"
    | "failed"

export interface QuestAssistantRealtimeStoredEvent {
    id: string
    userId: string
    syncId: number
    conversationId: string
    organizationId: string | null
    modelName: AssistantSyncAction["modelName"]
    modelId: string
    operation: AssistantSyncAction["operation"]
    timestamp: string
    receivedAt: string
    event: AssistantSyncAction["payload"]
}

export interface QuestAssistantRealtimeProjection {
    actions: AssistantAction[]
    conversationProjections: AssistantConversationProjection[]
    deletedConversations: QuestAssistantRealtimeConversationTombstone[]
    meta: QuestAssistantRealtimeMetadata
}

export type QuestAssistantRealtimeRecordResult =
    | {
          status: Exclude<QuestAssistantRealtimeRecordStatus, "failed">
      }
    | {
          status: "failed"
          error: unknown
      }

let questAssistantRealtimeRegistryDatabasePromise: Promise<IDBDatabase> | null = null
const questAssistantRealtimeDatabasePromises = new Map<string, Promise<IDBDatabase>>()
const questAssistantRealtimeDatabaseNamePromises = new Map<string, Promise<string>>()

export function createQuestAssistantRealtimeStoredEvent(input: {
    userId: string
    syncAction: AssistantSyncAction
    receivedAt?: string
}): QuestAssistantRealtimeStoredEvent {
    const receivedAt = input.receivedAt ?? new Date().toISOString()

    return {
        id: getQuestAssistantRealtimeEventStorageKey(input.userId, input.syncAction.syncId),
        userId: input.userId,
        syncId: input.syncAction.syncId,
        conversationId: input.syncAction.conversationId,
        organizationId: input.syncAction.organizationId,
        modelName: input.syncAction.modelName,
        modelId: input.syncAction.modelId,
        operation: input.syncAction.operation,
        timestamp: input.syncAction.createdAt,
        receivedAt,
        event: input.syncAction.payload,
    }
}

export function getQuestAssistantSyncActionWriteStatus(input: {
    lastSyncId: number
    incomingSyncId: number
}): Extract<QuestAssistantRealtimeRecordStatus, "stored" | "duplicate" | "gap"> {
    if (input.incomingSyncId <= input.lastSyncId) return "duplicate"
    if (input.incomingSyncId > input.lastSyncId + 1) return "gap"

    return "stored"
}

export function createQuestAssistantRealtimeConversationTombstone(input: {
    userId: string
    conversationId: string
    deletedAt: string
    syncId: number | null
    source: QuestAssistantRealtimeConversationTombstone["source"]
    updatedAt: string
}): QuestAssistantRealtimeConversationTombstone {
    return {
        id: getQuestAssistantRealtimeProjectionStorageKey(input.userId, input.conversationId),
        userId: input.userId,
        conversationId: input.conversationId,
        deletedAt: input.deletedAt,
        syncId: input.syncId,
        source: input.source,
        updatedAt: input.updatedAt,
    }
}

export function filterQuestAssistantRealtimeDeletedProjection(input: {
    actions: AssistantAction[]
    conversationProjections: AssistantConversationProjection[]
    deletedConversations: QuestAssistantRealtimeConversationTombstone[]
}): Pick<QuestAssistantRealtimeProjection, "actions" | "conversationProjections"> {
    const deletedConversationIds = new Set(
        input.deletedConversations.map((tombstone) => tombstone.conversationId)
    )

    return {
        actions: input.actions.filter(
            (action) => !action.conversationId || !deletedConversationIds.has(action.conversationId)
        ),
        conversationProjections: input.conversationProjections.filter(
            (projection) => !deletedConversationIds.has(projection.id)
        ),
    }
}

export async function recordQuestAssistantSyncAction(input: {
    userId: string | null | undefined
    syncAction: AssistantSyncAction
}): Promise<QuestAssistantRealtimeRecordResult> {
    if (!input.userId || typeof indexedDB === "undefined") {
        return { status: "unavailable" }
    }

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        const record = createQuestAssistantRealtimeStoredEvent({
            userId: input.userId,
            syncAction: input.syncAction,
        })

        return await writeQuestAssistantRealtimeEvent(database, record)
    } catch (error) {
        return { status: "failed", error }
    }
}

export async function recordQuestAssistantConversationOptimisticDeletion(input: {
    userId: string | null | undefined
    conversationId: string
    deletedAt?: string
}): Promise<QuestAssistantRealtimeRecordResult> {
    if (!input.userId || typeof indexedDB === "undefined") {
        return { status: "unavailable" }
    }

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        const deletedAt = input.deletedAt ?? new Date().toISOString()
        const tombstone = createQuestAssistantRealtimeConversationTombstone({
            userId: input.userId,
            conversationId: input.conversationId,
            deletedAt,
            syncId: null,
            source: "optimistic",
            updatedAt: deletedAt,
        })

        return await writeQuestAssistantConversationOptimisticDeletion(database, tombstone)
    } catch (error) {
        return { status: "failed", error }
    }
}

export async function clearQuestAssistantConversationOptimisticDeletion(input: {
    userId: string | null | undefined
    conversationId: string
}): Promise<void> {
    if (!input.userId || typeof indexedDB === "undefined") return

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        await deleteQuestAssistantConversationOptimisticTombstone(database, {
            userId: input.userId,
            conversationId: input.conversationId,
        })
    } catch {
        return
    }
}

export async function recordQuestAssistantPromptProjection(input: {
    userId: string | null | undefined
    conversation: AssistantConversation
    messageId: string
    content: string
    attachments: AssistantAttachment[]
    createdAt: string
    runId?: string | null
}): Promise<QuestAssistantRealtimeRecordResult> {
    if (!input.userId || typeof indexedDB === "undefined") {
        return { status: "unavailable" }
    }

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        const part = createAssistantPromptProjectionPart({
            userId: input.userId,
            messageId: input.messageId,
            content: input.content,
            attachments: input.attachments,
            createdAt: input.createdAt,
            runId: input.runId ?? null,
        })

        return await writeQuestAssistantLocalProjectionPart(database, {
            userId: input.userId,
            conversation: input.conversation,
            part,
            status: "streaming",
            updatedAt: input.createdAt,
        })
    } catch (error) {
        return { status: "failed", error }
    }
}

export async function removeQuestAssistantConversationProjection(input: {
    userId: string | null | undefined
    conversationId: string
}): Promise<void> {
    if (!input.userId || typeof indexedDB === "undefined") return

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        await deleteQuestAssistantConversationProjection(database, {
            userId: input.userId,
            conversationId: input.conversationId,
        })
    } catch {
        return
    }
}

export async function removeQuestAssistantProjectionParts(input: {
    userId: string | null | undefined
    conversationId: string
    partIds: string[]
}): Promise<void> {
    if (!input.userId || typeof indexedDB === "undefined" || input.partIds.length === 0) return

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        await deleteQuestAssistantConversationProjectionParts(database, {
            userId: input.userId,
            conversationId: input.conversationId,
            partIds: input.partIds,
        })
    } catch {
        return
    }
}

export async function readQuestAssistantRealtimeProjection(input: {
    userId: string | null | undefined
    conversationId?: string | null
}): Promise<QuestAssistantRealtimeProjection | null> {
    if (!input.userId || typeof indexedDB === "undefined") return null

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        const actionRecords = await readIndexedDbIndexRecords(
            database,
            QUEST_ASSISTANT_REALTIME_ACTIONS_STORE,
            input.conversationId ? "by-user-conversation" : "by-user",
            input.conversationId ? [input.userId, input.conversationId] : input.userId
        )
        const conversationProjectionRecords = await readIndexedDbIndexRecords(
            database,
            QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE,
            input.conversationId ? "by-user-conversation" : "by-user",
            input.conversationId ? [input.userId, input.conversationId] : input.userId
        )
        const deletedConversationRecords = await readIndexedDbIndexRecords(
            database,
            QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE,
            "by-user",
            input.userId
        )
        const meta = await readQuestAssistantSyncMetadataFromDatabase(database, input.userId)
        const deletedConversations = parseQuestAssistantRealtimeProjectionRecords(
            deletedConversationRecords,
            questAssistantRealtimeConversationTombstoneSchema,
            (record) => record
        )
        const filteredProjection = filterQuestAssistantRealtimeDeletedProjection({
            actions: parseQuestAssistantRealtimeProjectionRecords(
                actionRecords,
                questAssistantRealtimeActionProjectionSchema,
                (record) => record.action
            ),
            conversationProjections: parseQuestAssistantRealtimeProjectionRecords(
                conversationProjectionRecords,
                assistantConversationProjectionSchema,
                (record) => record
            ),
            deletedConversations,
        })

        return {
            actions: filteredProjection.actions,
            conversationProjections: filteredProjection.conversationProjections.sort(
                (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
            ),
            deletedConversations,
            meta,
        }
    } catch {
        return null
    }
}

export async function readQuestAssistantSyncMetadata(input: {
    userId: string | null | undefined
}): Promise<QuestAssistantRealtimeMetadata | null> {
    if (!input.userId || typeof indexedDB === "undefined") return null

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        return await readQuestAssistantSyncMetadataFromDatabase(database, input.userId)
    } catch {
        return null
    }
}

export function shouldResetQuestAssistantRealtimeProjectionCache(input: {
    metadata: QuestAssistantRealtimeMetadata | null
    projection: QuestAssistantRealtimeProjection | null
}): boolean {
    const lastSyncId = input.metadata?.lastSyncId ?? input.projection?.meta.lastSyncId ?? 0
    if (lastSyncId === 0) return false

    return (
        !input.projection ||
        (input.projection.actions.length === 0 &&
            input.projection.conversationProjections.length === 0 &&
            input.projection.deletedConversations.length === 0)
    )
}

export async function resetQuestAssistantRealtimeLocalData(input: {
    userId: string | null | undefined
}): Promise<boolean> {
    if (!input.userId || typeof indexedDB === "undefined") return false

    try {
        const database = await openQuestAssistantRealtimeDatabase(input.userId)
        await clearQuestAssistantRealtimeStores(database)

        return true
    } catch {
        return false
    }
}

function createDefaultQuestAssistantSyncMetadata(userId: string): QuestAssistantRealtimeMetadata {
    return {
        id: QUEST_ASSISTANT_REALTIME_META_ID,
        userId,
        firstSyncId: 0,
        lastSyncId: 0,
        schemaVersion: QUEST_ASSISTANT_REALTIME_DB_VERSION,
        updatedAt: new Date(0).toISOString(),
    }
}

function readQuestAssistantSyncMetadataFromDatabase(
    database: IDBDatabase,
    userId: string
): Promise<QuestAssistantRealtimeMetadata> {
    return new Promise<QuestAssistantRealtimeMetadata>((resolve, reject) => {
        const transaction = database.transaction(QUEST_ASSISTANT_REALTIME_META_STORE, "readonly")
        const store = transaction.objectStore(QUEST_ASSISTANT_REALTIME_META_STORE)
        const request = store.get(QUEST_ASSISTANT_REALTIME_META_ID)

        request.onsuccess = () => {
            const parsedMeta = safeParseSchema(questAssistantRealtimeMetadataSchema, request.result)
            resolve(
                parsedMeta.success
                    ? parsedMeta.data
                    : createDefaultQuestAssistantSyncMetadata(userId)
            )
        }
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to read assistant sync metadata"))
    })
}

function clearQuestAssistantRealtimeStores(database: IDBDatabase): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
            [
                QUEST_ASSISTANT_REALTIME_EVENTS_STORE,
                QUEST_ASSISTANT_REALTIME_META_STORE,
                QUEST_ASSISTANT_REALTIME_ACTIONS_STORE,
                QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE,
                QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE,
            ],
            "readwrite"
        )

        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
            reject(transaction.error ?? new Error("Failed to clear assistant realtime data"))
        transaction.onabort = () =>
            reject(transaction.error ?? new Error("Assistant realtime data clear aborted"))

        transaction.objectStore(QUEST_ASSISTANT_REALTIME_EVENTS_STORE).clear()
        transaction.objectStore(QUEST_ASSISTANT_REALTIME_META_STORE).clear()
        transaction.objectStore(QUEST_ASSISTANT_REALTIME_ACTIONS_STORE).clear()
        transaction.objectStore(QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE).clear()
        transaction.objectStore(QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE).clear()
    })
}

export async function clearQuestAssistantRealtimeLog(input: {
    userId: string | null | undefined
}): Promise<void> {
    if (!input.userId || typeof indexedDB === "undefined") return

    const databaseName = await readQuestAssistantRealtimeDatabaseName(input.userId)
    if (!databaseName) return

    const existingDatabase = await questAssistantRealtimeDatabasePromises
        .get(databaseName)
        ?.catch(() => null)
    existingDatabase?.close()
    questAssistantRealtimeDatabasePromises.delete(databaseName)

    const didDeleteDatabase = await new Promise<boolean>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName)

        request.onsuccess = () => resolve(true)
        request.onerror = () => reject(request.error ?? new Error("Failed to delete assistant log"))
        request.onblocked = () => resolve(false)
    })

    if (didDeleteDatabase) {
        await deleteQuestAssistantRealtimeDatabaseRegistryRecord(databaseName)
    }
}

async function openQuestAssistantRealtimeDatabase(userId: string): Promise<IDBDatabase> {
    const databaseName = await getQuestAssistantRealtimeDatabaseName(userId)
    const existingPromise = questAssistantRealtimeDatabasePromises.get(databaseName)
    if (existingPromise) return existingPromise

    const databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, QUEST_ASSISTANT_REALTIME_DB_VERSION)

        request.onupgradeneeded = () => {
            upgradeQuestAssistantRealtimeDatabase({
                database: request.result,
                transaction: request.transaction,
            })
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error("Failed to open assistant log"))
    })

    questAssistantRealtimeDatabasePromises.set(databaseName, databasePromise)

    return databasePromise
}

function upgradeQuestAssistantRealtimeDatabase(input: {
    database: IDBDatabase
    transaction: IDBTransaction | null
}) {
    createQuestAssistantRealtimeEventStore(input.database)
    createQuestAssistantRealtimeMetaStore(input.database)
    createQuestAssistantRealtimeActionStore(input.database)
    createQuestAssistantRealtimeConversationProjectionStore(input.database)
    createQuestAssistantRealtimeDeletedConversationStore(input.database)
}

function createQuestAssistantRealtimeEventStore(database: IDBDatabase) {
    if (database.objectStoreNames.contains(QUEST_ASSISTANT_REALTIME_EVENTS_STORE)) return

    const eventsStore = database.createObjectStore(QUEST_ASSISTANT_REALTIME_EVENTS_STORE, {
        keyPath: "id",
    })
    eventsStore.createIndex("by-user", "userId")
    eventsStore.createIndex("by-user-sync", ["userId", "syncId"])
}

function createQuestAssistantRealtimeMetaStore(database: IDBDatabase) {
    if (database.objectStoreNames.contains(QUEST_ASSISTANT_REALTIME_META_STORE)) return

    database.createObjectStore(QUEST_ASSISTANT_REALTIME_META_STORE, {
        keyPath: "id",
    })
}

function createQuestAssistantRealtimeActionStore(database: IDBDatabase) {
    if (database.objectStoreNames.contains(QUEST_ASSISTANT_REALTIME_ACTIONS_STORE)) return

    const actionsStore = database.createObjectStore(QUEST_ASSISTANT_REALTIME_ACTIONS_STORE, {
        keyPath: "id",
    })
    actionsStore.createIndex("by-user", "userId")
    actionsStore.createIndex("by-user-conversation", ["userId", "conversationId"])
}

function createQuestAssistantRealtimeConversationProjectionStore(database: IDBDatabase) {
    if (
        database.objectStoreNames.contains(QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE)
    ) {
        return
    }

    const conversationProjectionsStore = database.createObjectStore(
        QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE,
        { keyPath: "id" }
    )
    conversationProjectionsStore.createIndex("by-user", "userId")
    conversationProjectionsStore.createIndex("by-user-conversation", ["userId", "id"])
}

function createQuestAssistantRealtimeDeletedConversationStore(database: IDBDatabase) {
    if (database.objectStoreNames.contains(QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE)) {
        return
    }

    const deletedConversationsStore = database.createObjectStore(
        QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE,
        { keyPath: "id" }
    )
    deletedConversationsStore.createIndex("by-user", "userId")
    deletedConversationsStore.createIndex("by-user-conversation", ["userId", "conversationId"])
}

export async function getQuestAssistantRealtimeDatabaseName(userId: string): Promise<string> {
    const promiseKey = [
        userId,
        QUEST_ASSISTANT_REALTIME_SCHEMA_HASH,
        QUEST_ASSISTANT_REALTIME_DB_VERSION,
        QUEST_ASSISTANT_REALTIME_DATABASE_RECORD_VERSION,
    ].join(":")
    const existingPromise = questAssistantRealtimeDatabaseNamePromises.get(promiseKey)
    if (existingPromise) return existingPromise

    const databaseNamePromise = resolveQuestAssistantRealtimeDatabaseName(userId).catch((error) => {
        questAssistantRealtimeDatabaseNamePromises.delete(promiseKey)
        throw error
    })

    questAssistantRealtimeDatabaseNamePromises.set(promiseKey, databaseNamePromise)

    return databaseNamePromise
}

async function resolveQuestAssistantRealtimeDatabaseName(userId: string): Promise<string> {
    const databaseName = await createQuestAssistantRealtimeDatabaseNameForRegistryRecord({ userId })
    const existingDatabaseName = await readQuestAssistantRealtimeDatabaseName(userId)
    if (existingDatabaseName === databaseName) return existingDatabaseName

    if (existingDatabaseName) {
        questAssistantRealtimeDatabasePromises.delete(existingDatabaseName)
        await deleteQuestAssistantRealtimeDatabaseRegistryRecord(existingDatabaseName)
    }

    const record = createQuestAssistantRealtimeDatabaseRegistryRecord({
        name: databaseName,
        userId,
    })

    try {
        await addQuestAssistantRealtimeDatabaseRegistryRecord(record)
        return record.name
    } catch (error) {
        const racedDatabaseName = await readQuestAssistantRealtimeDatabaseName(userId)
        if (racedDatabaseName) return racedDatabaseName

        throw error
    }
}

export function createQuestAssistantRealtimeDatabaseName(databaseId: string): string {
    return `${QUEST_ASSISTANT_REALTIME_DB_PREFIX}_${databaseId}`
}

export async function createQuestAssistantRealtimeDatabaseNameForRegistryRecord(input: {
    userId: string
    userVersion?: string | null
}): Promise<string> {
    const databaseId = await createQuestAssistantRealtimeDatabaseIdHash({
        schemaHash: QUEST_ASSISTANT_REALTIME_SCHEMA_HASH,
        schemaVersion: QUEST_ASSISTANT_REALTIME_DB_VERSION,
        userId: input.userId,
        userVersion: input.userVersion ?? null,
        version: QUEST_ASSISTANT_REALTIME_DATABASE_RECORD_VERSION,
    })

    return createQuestAssistantRealtimeDatabaseName(databaseId)
}

export function createQuestAssistantRealtimeDatabaseRegistryRecord(input: {
    createdAt?: number
    name: string
    userId: string
}): QuestAssistantRealtimeDatabaseRegistryRecord {
    return {
        createdAt: input.createdAt ?? Date.now(),
        name: input.name,
        schemaHash: QUEST_ASSISTANT_REALTIME_SCHEMA_HASH,
        schemaVersion: QUEST_ASSISTANT_REALTIME_DB_VERSION,
        userId: input.userId,
        userVersion: null,
        version: QUEST_ASSISTANT_REALTIME_DATABASE_RECORD_VERSION,
    }
}

export function getQuestAssistantRealtimeDatabaseRegistryLookupKey(
    userId: string
): [string, string, number, number] {
    return [
        userId,
        QUEST_ASSISTANT_REALTIME_SCHEMA_HASH,
        QUEST_ASSISTANT_REALTIME_DB_VERSION,
        QUEST_ASSISTANT_REALTIME_DATABASE_RECORD_VERSION,
    ]
}

async function createQuestAssistantRealtimeDatabaseIdHash(input: {
    schemaHash: string
    schemaVersion: number
    userId: string
    userVersion: string | null
    version: number
}): Promise<string> {
    const hashInput = JSON.stringify({
        schemaHash: input.schemaHash,
        schemaVersion: input.schemaVersion,
        userId: input.userId,
        userVersion: input.userVersion,
        version: input.version,
    })
    const digest = await globalThis.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(hashInput)
    )

    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32)
}

async function readQuestAssistantRealtimeDatabaseName(userId: string): Promise<string | null> {
    const database = await openQuestAssistantRealtimeRegistryDatabase()
    const matchingRecord = await readQuestAssistantRealtimeDatabaseRegistryRecord(database, userId)

    return matchingRecord?.name ?? null
}

function openQuestAssistantRealtimeRegistryDatabase(): Promise<IDBDatabase> {
    questAssistantRealtimeRegistryDatabasePromise ??= new Promise<IDBDatabase>(
        (resolve, reject) => {
            const request = indexedDB.open(
                QUEST_ASSISTANT_REALTIME_REGISTRY_DB_NAME,
                QUEST_ASSISTANT_REALTIME_REGISTRY_DB_VERSION
            )

            request.onupgradeneeded = () => {
                upgradeQuestAssistantRealtimeRegistryDatabase({
                    database: request.result,
                    transaction: request.transaction,
                })
            }

            request.onsuccess = () => resolve(request.result)
            request.onerror = () =>
                reject(request.error ?? new Error("Failed to open assistant database registry"))
        }
    )

    return questAssistantRealtimeRegistryDatabasePromise
}

function upgradeQuestAssistantRealtimeRegistryDatabase(input: {
    database: IDBDatabase
    transaction: IDBTransaction | null
}) {
    const store = input.database.objectStoreNames.contains(
        QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE
    )
        ? input.transaction?.objectStore(QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE)
        : input.database.createObjectStore(QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE, {
              keyPath: "name",
          })

    if (!store) {
        throw new Error("Assistant database registry upgrade transaction is unavailable")
    }

    if (!store.indexNames.contains(QUEST_ASSISTANT_REALTIME_REGISTRY_BY_USER_SCHEMA_INDEX)) {
        store.createIndex(
            QUEST_ASSISTANT_REALTIME_REGISTRY_BY_USER_SCHEMA_INDEX,
            ["userId", "schemaHash", "schemaVersion", "version"],
            { unique: true }
        )
    }
}

function readQuestAssistantRealtimeDatabaseRegistryRecord(
    database: IDBDatabase,
    userId: string
): Promise<QuestAssistantRealtimeDatabaseRegistryRecord | null> {
    return new Promise<QuestAssistantRealtimeDatabaseRegistryRecord | null>((resolve, reject) => {
        const transaction = database.transaction(
            QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE,
            "readonly"
        )
        const store = transaction.objectStore(QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE)
        const index = store.index(QUEST_ASSISTANT_REALTIME_REGISTRY_BY_USER_SCHEMA_INDEX)
        const request = index.get(getQuestAssistantRealtimeDatabaseRegistryLookupKey(userId))

        request.onsuccess = () => {
            const parsedRecord = safeParseSchema(
                questAssistantRealtimeDatabaseRegistryRecordSchema,
                request.result
            )

            resolve(parsedRecord.success ? parsedRecord.data : null)
        }
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to read assistant database registry"))
    })
}

async function addQuestAssistantRealtimeDatabaseRegistryRecord(
    record: QuestAssistantRealtimeDatabaseRegistryRecord
): Promise<void> {
    const database = await openQuestAssistantRealtimeRegistryDatabase()

    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
            QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE,
            "readwrite"
        )
        const store = transaction.objectStore(QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE)

        store.add(record)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
            reject(transaction.error ?? new Error("Failed to write assistant database registry"))
        transaction.onabort = () => {
            reject(transaction.error ?? new Error("Assistant database registry write aborted"))
        }
    })
}

async function deleteQuestAssistantRealtimeDatabaseRegistryRecord(name: string): Promise<void> {
    const database = await openQuestAssistantRealtimeRegistryDatabase()

    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
            QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE,
            "readwrite"
        )
        const store = transaction.objectStore(QUEST_ASSISTANT_REALTIME_REGISTRY_DATABASES_STORE)

        store.delete(name)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
            reject(transaction.error ?? new Error("Failed to delete assistant database registry"))
        transaction.onabort = () =>
            reject(transaction.error ?? new Error("Assistant database registry delete aborted"))
    })
}

function writeQuestAssistantRealtimeEvent(
    database: IDBDatabase,
    record: QuestAssistantRealtimeStoredEvent
): Promise<QuestAssistantRealtimeRecordResult> {
    return new Promise<QuestAssistantRealtimeRecordResult>((resolve) => {
        const transaction = database.transaction(
            [
                QUEST_ASSISTANT_REALTIME_EVENTS_STORE,
                QUEST_ASSISTANT_REALTIME_META_STORE,
                QUEST_ASSISTANT_REALTIME_ACTIONS_STORE,
                QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE,
                QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE,
            ],
            "readwrite"
        )
        const eventsStore = transaction.objectStore(QUEST_ASSISTANT_REALTIME_EVENTS_STORE)
        const metaStore = transaction.objectStore(QUEST_ASSISTANT_REALTIME_META_STORE)
        const deletedConversationsStore = transaction.objectStore(
            QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE
        )
        const projectionStores = {
            actionsStore: transaction.objectStore(QUEST_ASSISTANT_REALTIME_ACTIONS_STORE),
            conversationProjectionsStore: transaction.objectStore(
                QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE
            ),
            deletedConversationsStore,
        }
        let status: QuestAssistantRealtimeRecordStatus = "stored"
        let failure: unknown = null
        let shouldSkipProjection = false

        transaction.oncomplete = () => {
            if (status === "failed") {
                resolve({ status: "failed", error: failure })
                return
            }

            resolve({ status })
        }
        transaction.onerror = () => {
            status = "failed"
            failure = transaction.error
        }
        transaction.onabort = () => {
            resolve({
                status: "failed",
                error: transaction.error ?? failure ?? new Error("Assistant log write aborted"),
            })
        }

        const existingEventRequest = eventsStore.get(record.id)
        existingEventRequest.onsuccess = () => {
            if (existingEventRequest.result) {
                status = "duplicate"
                return
            }

            const tombstoneRequest = deletedConversationsStore.get(
                getQuestAssistantRealtimeProjectionStorageKey(record.userId, record.conversationId)
            )
            tombstoneRequest.onsuccess = () => {
                const parsedTombstone = safeParseSchema(
                    questAssistantRealtimeConversationTombstoneSchema,
                    tombstoneRequest.result
                )
                if (parsedTombstone.success && record.event.type !== "conversation_deleted") {
                    shouldSkipProjection = true
                }

                const metaRequest = metaStore.get(QUEST_ASSISTANT_REALTIME_META_ID)
                metaRequest.onsuccess = () => {
                    const parsedMeta = safeParseSchema(
                        questAssistantRealtimeMetadataSchema,
                        metaRequest.result
                    )
                    const currentMeta = parsedMeta.success
                        ? parsedMeta.data
                        : createDefaultQuestAssistantSyncMetadata(record.userId)
                    status = getQuestAssistantSyncActionWriteStatus({
                        lastSyncId: currentMeta.lastSyncId,
                        incomingSyncId: record.syncId,
                    })

                    if (status !== "stored") return

                    eventsStore.add(record)
                    if (!shouldSkipProjection) {
                        applyQuestAssistantRealtimeProjectionRecord({
                            record,
                            stores: projectionStores,
                        })
                    }
                    metaStore.put({
                        id: QUEST_ASSISTANT_REALTIME_META_ID,
                        userId: record.userId,
                        firstSyncId:
                            currentMeta.firstSyncId > 0 ? currentMeta.firstSyncId : record.syncId,
                        lastSyncId: record.syncId,
                        schemaVersion: QUEST_ASSISTANT_REALTIME_DB_VERSION,
                        updatedAt: record.receivedAt,
                    })
                }
            }
        }
    })
}

function applyQuestAssistantRealtimeProjectionRecord(input: {
    record: QuestAssistantRealtimeStoredEvent
    stores: {
        actionsStore: IDBObjectStore
        conversationProjectionsStore: IDBObjectStore
        deletedConversationsStore: IDBObjectStore
    }
}) {
    const event = input.record.event

    switch (event.type) {
        case "conversation_created":
            upsertConversationThreadProjection(input.stores.conversationProjectionsStore, {
                record: input.record,
                conversation: event.conversation,
                status: "streaming",
            })
            return
        case "conversation_updated":
            upsertConversationThreadProjection(input.stores.conversationProjectionsStore, {
                record: input.record,
                conversation: event.conversation,
                status: "complete",
            })
            return
        case "title_updated":
            updateConversationThreadProjectionTitle(input.stores.conversationProjectionsStore, {
                record: input.record,
                title: event.title,
            })
            return
        case "message_inserted":
            upsertConversationThreadProjectionPart(input.stores.conversationProjectionsStore, {
                record: input.record,
                part: createAssistantMessageProjectionPart({
                    userId: input.record.userId,
                    message: event.message,
                }),
                status: "streaming",
            })
            return
        case "conversation_deleted":
            putConversationDeletedProjectionRecord(input.stores, {
                record: input.record,
                deletedAt: event.deletedAt,
            })
            return
        case "part_started":
            upsertConversationThreadProjectionPart(input.stores.conversationProjectionsStore, {
                record: input.record,
                part: event.part,
                status: "streaming",
            })
            return
        case "part_delta":
            appendConversationThreadProjectionPartDelta(input.stores.conversationProjectionsStore, {
                record: input.record,
                partId: event.partId,
                delta: event.delta,
            })
            return
        case "part_completed":
            completeConversationThreadProjectionPart(input.stores.conversationProjectionsStore, {
                record: input.record,
                partId: event.partId,
                content: event.content,
            })
            return
        case "action_proposed":
        case "action_updated":
            putActionProjectionRecord(input.stores.actionsStore, {
                record: input.record,
                action: event.action,
            })
            return
        case "run_completed":
            updateConversationThreadProjectionStatus(input.stores.conversationProjectionsStore, {
                record: input.record,
                status: "complete",
            })
            return
        case "run_failed":
            updateConversationThreadProjectionStatus(input.stores.conversationProjectionsStore, {
                record: input.record,
                status: "failed",
            })
            return
    }
}

function putConversationDeletedProjectionRecord(
    stores: {
        actionsStore: IDBObjectStore
        conversationProjectionsStore: IDBObjectStore
        deletedConversationsStore: IDBObjectStore
    },
    input: {
        record: QuestAssistantRealtimeStoredEvent
        deletedAt: string
    }
) {
    const conversationStorageId = getQuestAssistantRealtimeProjectionStorageKey(
        input.record.userId,
        input.record.conversationId
    )

    stores.deletedConversationsStore.put(
        createQuestAssistantRealtimeConversationTombstone({
            userId: input.record.userId,
            conversationId: input.record.conversationId,
            deletedAt: input.deletedAt,
            syncId: input.record.syncId,
            source: "server",
            updatedAt: input.record.receivedAt,
        })
    )
    stores.conversationProjectionsStore.delete(conversationStorageId)
    deleteIndexedDbIndexRecords(stores.actionsStore, "by-user-conversation", [
        input.record.userId,
        input.record.conversationId,
    ])
}

function putActionProjectionRecord(
    actionsStore: IDBObjectStore,
    input: {
        record: QuestAssistantRealtimeStoredEvent
        action: AssistantAction
    }
) {
    const conversationId = input.action.conversationId ?? input.record.conversationId
    const nextRecord: QuestAssistantRealtimeActionProjectionRecord = {
        id: getQuestAssistantRealtimeProjectionStorageKey(input.record.userId, input.action.id),
        userId: input.record.userId,
        conversationId,
        action: {
            ...input.action,
            conversationId,
        },
        updatedAt: input.record.receivedAt,
    }

    actionsStore.put(nextRecord)
}

function writeQuestAssistantLocalProjectionPart(
    database: IDBDatabase,
    input: {
        userId: string
        conversation: AssistantConversation
        part: AssistantConversationProjectionPart
        status: AssistantConversationProjection["status"]
        updatedAt: string
    }
): Promise<QuestAssistantRealtimeRecordResult> {
    return new Promise<QuestAssistantRealtimeRecordResult>((resolve) => {
        const transaction = database.transaction(
            QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE,
            "readwrite"
        )
        const conversationProjectionsStore = transaction.objectStore(
            QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE
        )
        const record = createLocalProjectionWriteRecord({
            userId: input.userId,
            conversationId: input.conversation.id,
            organizationId: input.conversation.organizationId,
            id: input.part.id,
            runId: input.part.runId ?? null,
            timestamp: input.updatedAt,
        })
        let status: QuestAssistantRealtimeRecordStatus = "stored"
        let failure: unknown = null

        transaction.oncomplete = () => {
            if (status === "failed") {
                resolve({ status: "failed", error: failure })
                return
            }

            resolve({ status })
        }
        transaction.onerror = () => {
            status = "failed"
            failure = transaction.error
        }
        transaction.onabort = () => {
            resolve({
                status: "failed",
                error:
                    transaction.error ??
                    failure ??
                    new Error("Assistant local projection write aborted"),
            })
        }

        upsertConversationThreadProjectionPart(conversationProjectionsStore, {
            record,
            conversation: input.conversation,
            part: input.part,
            status: input.status,
        })
    })
}

function deleteQuestAssistantConversationProjection(
    database: IDBDatabase,
    input: {
        userId: string
        conversationId: string
    }
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
            [
                QUEST_ASSISTANT_REALTIME_ACTIONS_STORE,
                QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE,
            ],
            "readwrite"
        )
        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
            reject(transaction.error ?? new Error("Failed to delete assistant projection"))
        transaction.onabort = () =>
            reject(transaction.error ?? new Error("Assistant projection delete aborted"))

        transaction
            .objectStore(QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE)
            .delete(input.conversationId)
        deleteIndexedDbIndexRecords(
            transaction.objectStore(QUEST_ASSISTANT_REALTIME_ACTIONS_STORE),
            "by-user-conversation",
            [input.userId, input.conversationId]
        )
    })
}

function deleteQuestAssistantConversationProjectionParts(
    database: IDBDatabase,
    input: {
        userId: string
        conversationId: string
        partIds: string[]
    }
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
            QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE,
            "readwrite"
        )
        const conversationProjectionsStore = transaction.objectStore(
            QUEST_ASSISTANT_REALTIME_CONVERSATION_PROJECTIONS_STORE
        )
        const partIds = new Set(input.partIds)
        const conversationId = input.conversationId

        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
            reject(transaction.error ?? new Error("Failed to delete assistant projection parts"))
        transaction.onabort = () =>
            reject(transaction.error ?? new Error("Assistant projection parts delete aborted"))

        const existingProjectionRequest = conversationProjectionsStore.get(conversationId)
        existingProjectionRequest.onsuccess = () => {
            const parsedProjection = safeParseSchema(
                assistantConversationProjectionSchema,
                existingProjectionRequest.result
            )
            if (!parsedProjection.success) return

            putConversationThreadProjectionRecord(conversationProjectionsStore, {
                userId: input.userId,
                projection: {
                    ...parsedProjection.data,
                    parts: parsedProjection.data.parts.filter((part) => !partIds.has(part.id)),
                    updatedAt: new Date().toISOString(),
                },
                updatedAt: new Date().toISOString(),
            })
        }
    })
}

function upsertConversationThreadProjection(
    conversationProjectionsStore: IDBObjectStore,
    input: {
        record: QuestAssistantRealtimeStoredEvent
        conversation: AssistantConversation
        status?: AssistantConversationProjection["status"]
    }
) {
    const conversationId = input.conversation.id
    const existingProjectionRequest = conversationProjectionsStore.get(conversationId)

    existingProjectionRequest.onsuccess = () => {
        const parsedProjection = safeParseSchema(
            assistantConversationProjectionSchema,
            existingProjectionRequest.result
        )
        const projection = parsedProjection.success
            ? {
                  ...parsedProjection.data,
                  organizationId: input.conversation.organizationId,
                  lastRoutePath: input.conversation.lastRoutePath,
                  summary: input.conversation.title,
                  status: input.status ?? parsedProjection.data.status,
                  updatedAt: input.record.timestamp,
              }
            : createAssistantConversationProjection({
                  userId: input.record.userId,
                  conversation: input.conversation,
                  parts: [],
                  status: input.status ?? "streaming",
                  readAt: null,
                  updatedAt: input.record.timestamp,
              })

        putConversationThreadProjectionRecord(conversationProjectionsStore, {
            userId: input.record.userId,
            projection,
            updatedAt: input.record.receivedAt,
        })
    }
}

function updateConversationThreadProjectionTitle(
    conversationProjectionsStore: IDBObjectStore,
    input: {
        record: QuestAssistantRealtimeStoredEvent
        title: string
    }
) {
    const conversationId = input.record.conversationId
    const existingProjectionRequest = conversationProjectionsStore.get(conversationId)

    existingProjectionRequest.onsuccess = () => {
        const parsedProjection = safeParseSchema(
            assistantConversationProjectionSchema,
            existingProjectionRequest.result
        )
        if (!parsedProjection.success) return

        putConversationThreadProjectionRecord(conversationProjectionsStore, {
            userId: input.record.userId,
            projection: {
                ...parsedProjection.data,
                summary: input.title,
                updatedAt: input.record.timestamp,
            },
            updatedAt: input.record.receivedAt,
        })
    }
}

function upsertConversationThreadProjectionPart(
    conversationProjectionsStore: IDBObjectStore,
    input: {
        record: QuestAssistantRealtimeStoredEvent
        part: AssistantConversationPart | AssistantConversationProjectionPart
        conversation?: AssistantConversation
        status?: AssistantConversationProjection["status"]
    }
) {
    const conversationId = input.record.conversationId
    const existingProjectionRequest = conversationProjectionsStore.get(conversationId)

    existingProjectionRequest.onsuccess = () => {
        const parsedProjection = safeParseSchema(
            assistantConversationProjectionSchema,
            existingProjectionRequest.result
        )
        const normalizedPart = normalizeAssistantProjectionPart({
            part: input.part,
            userId: input.record.userId,
        })
        const projection = parsedProjection.success
            ? {
                  ...parsedProjection.data,
                  status: input.status ?? parsedProjection.data.status,
                  parts: mergeAssistantProjectionParts(parsedProjection.data.parts, [
                      normalizedPart,
                  ]),
                  updatedAt: input.record.timestamp,
              }
            : input.conversation
              ? createAssistantConversationProjection({
                    userId: input.record.userId,
                    conversation: input.conversation,
                    parts: [normalizedPart],
                    status: input.status ?? "streaming",
                    readAt: null,
                    updatedAt: input.record.timestamp,
                })
              : null

        if (!projection) return

        putConversationThreadProjectionRecord(conversationProjectionsStore, {
            userId: input.record.userId,
            projection,
            updatedAt: input.record.receivedAt,
        })
    }
}

function appendConversationThreadProjectionPartDelta(
    conversationProjectionsStore: IDBObjectStore,
    input: {
        record: QuestAssistantRealtimeStoredEvent
        partId: string
        delta: string
    }
) {
    const conversationId = input.record.conversationId
    const existingProjectionRequest = conversationProjectionsStore.get(conversationId)

    existingProjectionRequest.onsuccess = () => {
        const parsedProjection = safeParseSchema(
            assistantConversationProjectionSchema,
            existingProjectionRequest.result
        )
        if (!parsedProjection.success) return

        const existingProjection = parsedProjection.data
        const existingPart = existingProjection.parts.find((part) => part.id === input.partId)
        if (!existingPart) return

        const nextContent = `${getAssistantProjectionPartText(existingPart)}${input.delta}`
        const nextPart = updateAssistantProjectionPartBody({
            part: existingPart,
            content: nextContent,
            status: "streaming",
            updatedAt: input.record.timestamp,
        })

        putConversationThreadProjectionRecord(conversationProjectionsStore, {
            userId: input.record.userId,
            projection: {
                ...existingProjection,
                status: "streaming",
                parts: mergeAssistantProjectionParts(existingProjection.parts, [nextPart]),
                updatedAt: input.record.timestamp,
            },
            updatedAt: input.record.receivedAt,
        })
    }
}

function completeConversationThreadProjectionPart(
    conversationProjectionsStore: IDBObjectStore,
    input: {
        record: QuestAssistantRealtimeStoredEvent
        partId: string
        content: string | undefined
    }
) {
    const conversationId = input.record.conversationId
    const existingProjectionRequest = conversationProjectionsStore.get(conversationId)

    existingProjectionRequest.onsuccess = () => {
        const parsedProjection = safeParseSchema(
            assistantConversationProjectionSchema,
            existingProjectionRequest.result
        )
        if (!parsedProjection.success) return

        const existingPart = parsedProjection.data.parts.find((part) => part.id === input.partId)
        if (!existingPart) return

        const nextContent = input.content ?? getAssistantProjectionPartText(existingPart)
        const nextPart = updateAssistantProjectionPartBody({
            part: existingPart,
            content: nextContent,
            status: "completed",
            updatedAt: input.record.timestamp,
        })

        putConversationThreadProjectionRecord(conversationProjectionsStore, {
            userId: input.record.userId,
            projection: {
                ...parsedProjection.data,
                parts: mergeAssistantProjectionParts(parsedProjection.data.parts, [nextPart]),
                updatedAt: input.record.timestamp,
            },
            updatedAt: input.record.receivedAt,
        })
    }
}

function updateConversationThreadProjectionStatus(
    conversationProjectionsStore: IDBObjectStore,
    input: {
        record: QuestAssistantRealtimeStoredEvent
        status: AssistantConversationProjection["status"]
    }
) {
    const conversationId = input.record.conversationId
    const existingProjectionRequest = conversationProjectionsStore.get(conversationId)

    existingProjectionRequest.onsuccess = () => {
        const parsedProjection = safeParseSchema(
            assistantConversationProjectionSchema,
            existingProjectionRequest.result
        )
        if (!parsedProjection.success) return

        putConversationThreadProjectionRecord(conversationProjectionsStore, {
            userId: input.record.userId,
            projection: {
                ...parsedProjection.data,
                status: input.status,
                updatedAt: input.record.timestamp,
            },
            updatedAt: input.record.receivedAt,
        })
    }
}

function putConversationThreadProjectionRecord(
    conversationProjectionsStore: IDBObjectStore,
    input: {
        userId: string
        projection: AssistantConversationProjection
        updatedAt: string
    }
) {
    const nextRecord: AssistantConversationProjection = {
        ...input.projection,
        userId: input.userId,
        parts: input.projection.parts
            .map((part) => normalizeAssistantProjectionPart({ part, userId: input.userId }))
            .sort(compareAssistantPartsForProjection),
        updatedAt: input.updatedAt,
    }

    conversationProjectionsStore.put(nextRecord)
}

function writeQuestAssistantConversationOptimisticDeletion(
    database: IDBDatabase,
    tombstone: QuestAssistantRealtimeConversationTombstone
): Promise<QuestAssistantRealtimeRecordResult> {
    return new Promise<QuestAssistantRealtimeRecordResult>((resolve) => {
        const transaction = database.transaction(
            QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE,
            "readwrite"
        )
        const deletedConversationsStore = transaction.objectStore(
            QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE
        )
        let status: QuestAssistantRealtimeRecordStatus = "stored"
        let failure: unknown = null

        transaction.oncomplete = () => {
            if (status === "failed") {
                resolve({ status: "failed", error: failure })
                return
            }

            resolve({ status })
        }
        transaction.onerror = () => {
            status = "failed"
            failure = transaction.error
        }
        transaction.onabort = () => {
            resolve({
                status: "failed",
                error:
                    transaction.error ??
                    failure ??
                    new Error("Assistant conversation delete tombstone write aborted"),
            })
        }

        const existingTombstoneRequest = deletedConversationsStore.get(tombstone.id)
        existingTombstoneRequest.onsuccess = () => {
            const parsedTombstone = safeParseSchema(
                questAssistantRealtimeConversationTombstoneSchema,
                existingTombstoneRequest.result
            )
            if (parsedTombstone.success && parsedTombstone.data.source === "server") {
                status = "duplicate"
                return
            }

            deletedConversationsStore.put(tombstone)
        }
    })
}

function deleteQuestAssistantConversationOptimisticTombstone(
    database: IDBDatabase,
    input: {
        userId: string
        conversationId: string
    }
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
            QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE,
            "readwrite"
        )
        const deletedConversationsStore = transaction.objectStore(
            QUEST_ASSISTANT_REALTIME_DELETED_CONVERSATIONS_STORE
        )
        const tombstoneId = getQuestAssistantRealtimeProjectionStorageKey(
            input.userId,
            input.conversationId
        )

        transaction.oncomplete = () => resolve()
        transaction.onerror = () =>
            reject(
                transaction.error ??
                    new Error("Failed to clear assistant conversation delete tombstone")
            )
        transaction.onabort = () =>
            reject(
                transaction.error ??
                    new Error("Assistant conversation delete tombstone cleanup aborted")
            )

        const existingTombstoneRequest = deletedConversationsStore.get(tombstoneId)
        existingTombstoneRequest.onsuccess = () => {
            const parsedTombstone = safeParseSchema(
                questAssistantRealtimeConversationTombstoneSchema,
                existingTombstoneRequest.result
            )
            if (!parsedTombstone.success || parsedTombstone.data.source !== "optimistic") {
                return
            }

            deletedConversationsStore.delete(tombstoneId)
        }
    })
}

export function createAssistantPromptProjectionPart(input: {
    userId: string
    messageId: string
    content: string
    attachments: AssistantAttachment[]
    createdAt: string
    runId: string | null
}): AssistantConversationProjectionPart {
    return {
        id: input.messageId,
        type: "prompt",
        userId: input.userId,
        metadata: {
            turnId: input.runId ?? input.messageId,
            context: [],
            startedAt: input.createdAt,
            endedAt: input.createdAt,
        },
        bodyData: createAssistantPromptBodyData({
            content: input.content,
            attachments: input.attachments,
        }),
        runId: input.runId,
        role: "user",
        status: "completed",
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
    }
}

function createAssistantMessageProjectionPart(input: {
    userId: string
    message: AssistantMessage
}): AssistantConversationProjectionPart {
    const attachments = getAssistantMessageAttachments(input.message)
    const type = input.message.role === "user" ? "prompt" : "text"
    const runId = getAssistantMessageRunId(input.message)

    return {
        id: input.message.id,
        type,
        ...(type === "prompt" ? { userId: input.userId } : {}),
        metadata: {
            ...(input.message.metadata ?? {}),
            turnId: runId ?? input.message.id,
            ...(type === "prompt" ? { context: [] } : {}),
            startedAt: input.message.createdAt,
            endedAt: input.message.createdAt,
        },
        bodyData:
            type === "prompt"
                ? createAssistantPromptBodyData({
                      content: input.message.content,
                      attachments,
                  })
                : createAssistantTextBodyData(input.message.content),
        runId,
        role: input.message.role,
        status: "completed",
        createdAt: input.message.createdAt,
        updatedAt: input.message.createdAt,
    }
}

export function createAssistantConversationProjection(input: {
    userId: string
    conversation: AssistantConversation
    parts: AssistantConversationProjectionPart[]
    status: AssistantConversationProjection["status"]
    readAt: string | null
    updatedAt: string
}): AssistantConversationProjection {
    return {
        id: input.conversation.id,
        userId: input.userId,
        organizationId: input.conversation.organizationId,
        lastRoutePath: input.conversation.lastRoutePath,
        clientPlatform: "web",
        context: [],
        initialSource: "directChat",
        status: input.status,
        summary: input.conversation.title,
        parts: mergeAssistantProjectionParts([], input.parts),
        pendingMessages: [],
        readAt: input.readAt,
        slugId: createAssistantConversationSlugId(input.conversation.id),
        createdAt: input.conversation.createdAt,
        updatedAt: input.updatedAt,
    }
}

function createLocalProjectionWriteRecord(input: {
    userId: string
    conversationId: string
    organizationId: string | null
    id: string
    runId: string | null
    timestamp: string
}): QuestAssistantRealtimeStoredEvent {
    return {
        id: getQuestAssistantRealtimeEventStorageKey(input.userId, `local:${input.id}`),
        userId: input.userId,
        syncId: 0,
        conversationId: input.conversationId,
        organizationId: input.organizationId,
        modelName: "assistant_part",
        modelId: input.id,
        operation: "insert",
        timestamp: input.timestamp,
        receivedAt: input.timestamp,
        event: {
            type: "run_completed",
            messageId: null,
        },
    }
}

export function normalizeAssistantProjectionPart(input: {
    part: AssistantConversationPart | AssistantConversationProjectionPart
    userId: string
}): AssistantConversationProjectionPart {
    const { part } = input
    const existingProjectionPart = part as AssistantConversationProjectionPart
    const content = "content" in part ? part.content : getAssistantProjectionPartText(part)
    const bodyData =
        existingProjectionPart.bodyData ??
        (part.type === "prompt"
            ? createAssistantPromptBodyData({
                  content,
                  attachments: "content" in part ? getAssistantPartAttachments(part) : [],
              })
            : createAssistantTextBodyData(content))

    const metadata = {
        ...(part.metadata ?? {}),
        turnId: part.runId ?? part.id,
        ...(part.type === "prompt" ? { context: [] } : {}),
        startedAt: part.createdAt,
        ...(part.status === "completed" ? { endedAt: part.updatedAt } : {}),
    }

    return {
        id: part.id,
        type: part.type,
        ...(part.type === "prompt" ? { userId: input.userId } : {}),
        ...(part.type === "reasoning" ? { title: getAssistantProjectionPartTitle(part) } : {}),
        metadata,
        bodyData,
        role: part.role,
        runId: part.runId,
        status: part.status,
        createdAt: part.createdAt,
        updatedAt: part.updatedAt,
    }
}

export function updateAssistantProjectionPartBody(input: {
    part: AssistantConversationProjectionPart
    content: string
    status: AssistantConversationPart["status"]
    updatedAt: string
}): AssistantConversationProjectionPart {
    return {
        ...input.part,
        status: input.status,
        bodyData: createAssistantTextBodyData(input.content),
        metadata: {
            ...(input.part.metadata ?? {}),
            ...(input.status === "completed" ? { endedAt: input.updatedAt } : {}),
        },
        updatedAt: input.updatedAt,
    }
}

function createAssistantPromptBodyData(input: {
    content: string
    attachments: AssistantAttachment[]
}): NonNullable<AssistantConversationProjectionPart["bodyData"]> {
    const content: Record<string, unknown>[] = []

    for (const attachment of input.attachments) {
        content.push(createAssistantAttachmentBodyNode(attachment))
    }

    const trimmedContent = input.content.trim()
    if (trimmedContent.length > 0) {
        content.push(createAssistantParagraphBodyNode(trimmedContent))
    }

    return {
        type: "doc",
        content,
    }
}

function createAssistantTextBodyData(
    content: string
): NonNullable<AssistantConversationProjectionPart["bodyData"]> {
    const trimmedContent = content.trim()

    return {
        type: "doc",
        content: trimmedContent.length > 0 ? [createAssistantParagraphBodyNode(content)] : [],
    }
}

function createAssistantParagraphBodyNode(content: string): Record<string, unknown> {
    return {
        type: "paragraph",
        content: [
            {
                type: "text",
                text: content,
            },
        ],
    }
}

function createAssistantAttachmentBodyNode(
    attachment: AssistantAttachment
): Record<string, unknown> {
    const attrs: Record<string, unknown> = {
        attachmentId: attachment.id,
        uploadId: attachment.id,
        uploadState: "complete",
        alt: null,
        title: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
    }
    const src = attachment.url ?? attachment.downloadUrl

    if (src) {
        attrs.src = src
    }

    if (attachment.width) {
        attrs.width = attachment.width
    }

    if (attachment.height) {
        attrs.height = attachment.height
    }

    return {
        type: attachment.mimeType.startsWith("image/") ? "image" : "file",
        attrs,
    }
}

function getAssistantMessageAttachments(message: AssistantMessage): AssistantAttachment[] {
    const attachments = message.metadata?.attachments
    const parsed = safeParseSchema(v.array(assistantAttachmentSchema), attachments)

    return parsed.success ? parsed.data : []
}

function getAssistantMessageRunId(message: AssistantMessage): string | null {
    const runId = message.metadata?.runId

    return typeof runId === "string" ? runId : null
}

function getAssistantPartAttachments(part: AssistantConversationPart): AssistantAttachment[] {
    const attachments = part.metadata?.attachments
    const parsed = safeParseSchema(v.array(assistantAttachmentSchema), attachments)

    return parsed.success ? parsed.data : []
}

export function getAssistantProjectionPartText(part: AssistantConversationProjectionPart): string {
    return getAssistantBodyDataText(part.bodyData)
}

function getAssistantBodyDataText(
    bodyData: AssistantConversationProjectionPart["bodyData"]
): string {
    if (!bodyData) return ""

    return bodyData.content.map(getAssistantBodyNodeText).filter(Boolean).join("\n\n")
}

function getAssistantBodyNodeText(node: Record<string, unknown>): string {
    if (node.type === "text" && typeof node.text === "string") return node.text

    if (!Array.isArray(node.content)) return ""

    return node.content
        .filter(
            (child): child is Record<string, unknown> => Boolean(child) && typeof child === "object"
        )
        .map(getAssistantBodyNodeText)
        .join("")
}

function getAssistantProjectionPartTitle(
    part: AssistantConversationPart | AssistantConversationProjectionPart
): string | undefined {
    const title = part.metadata?.label ?? part.metadata?.title

    return typeof title === "string" && title.trim().length > 0 ? title : undefined
}

function createAssistantConversationSlugId(conversationId: string): string {
    return conversationId.replaceAll("-", "").slice(0, 12)
}

export function mergeAssistantProjectionParts(
    existingParts: AssistantConversationProjectionPart[],
    nextParts: AssistantConversationProjectionPart[]
): AssistantConversationProjectionPart[] {
    const partsById = new Map<string, AssistantConversationProjectionPart>()

    for (const part of existingParts) {
        partsById.set(part.id, part)
    }

    for (const part of nextParts) {
        const normalizedPart = part
        const existingPart = partsById.get(normalizedPart.id)
        if (existingPart && isAssistantProjectionPartNewer(existingPart, normalizedPart)) {
            continue
        }

        partsById.set(normalizedPart.id, normalizedPart)
    }

    return [...partsById.values()].sort(compareAssistantPartsForProjection)
}

function isAssistantProjectionPartNewer(
    existingPart: AssistantConversationProjectionPart,
    nextPart: AssistantConversationProjectionPart
): boolean {
    const existingUpdatedAt = Date.parse(existingPart.updatedAt)
    const nextUpdatedAt = Date.parse(nextPart.updatedAt)

    return Number.isFinite(existingUpdatedAt) && existingUpdatedAt > nextUpdatedAt
}

function readIndexedDbIndexRecords(
    database: IDBDatabase,
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readonly")
        const request = transaction.objectStore(storeName).index(indexName).getAll(query)

        request.onsuccess = () => resolve(request.result)
        request.onerror = () =>
            reject(request.error ?? new Error(`Failed to read ${storeName} projection`))
        transaction.onabort = () =>
            reject(transaction.error ?? new Error(`Failed to read ${storeName} projection`))
    })
}

function deleteIndexedDbIndexRecords(
    store: IDBObjectStore,
    indexName: string,
    query: IDBValidKey | IDBKeyRange
) {
    const request = store.index(indexName).openCursor(query)

    request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return

        cursor.delete()
        cursor.continue()
    }
}

function parseQuestAssistantRealtimeProjectionRecords<TSchema extends v.GenericSchema, TResult>(
    records: unknown[],
    schema: TSchema,
    select: (record: v.InferOutput<TSchema>) => TResult
): TResult[] {
    return records.flatMap((record) => {
        const parsed = safeParseSchema(schema, record)
        return parsed.success ? [select(parsed.data)] : []
    })
}

function compareAssistantPartsForProjection(
    firstPart: AssistantConversationProjectionPart,
    secondPart: AssistantConversationProjectionPart
): number {
    const firstCreatedAt = Date.parse(firstPart.createdAt)
    const secondCreatedAt = Date.parse(secondPart.createdAt)
    if (
        Number.isFinite(firstCreatedAt) &&
        Number.isFinite(secondCreatedAt) &&
        firstCreatedAt !== secondCreatedAt
    ) {
        return firstCreatedAt - secondCreatedAt
    }

    const firstUpdatedAt = Date.parse(firstPart.updatedAt)
    const secondUpdatedAt = Date.parse(secondPart.updatedAt)
    if (
        Number.isFinite(firstUpdatedAt) &&
        Number.isFinite(secondUpdatedAt) &&
        firstUpdatedAt !== secondUpdatedAt
    ) {
        return firstUpdatedAt - secondUpdatedAt
    }

    return firstPart.id.localeCompare(secondPart.id)
}

function getQuestAssistantRealtimeEventStorageKey(userId: string, syncId: number | string): string {
    return `${userId}:${syncId}`
}

function getQuestAssistantRealtimeProjectionStorageKey(userId: string, id: string): string {
    return `${userId}:${id}`
}
