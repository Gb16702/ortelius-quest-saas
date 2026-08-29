import { fetchAssistantSyncActions } from "../api/quest-assistant-sync.api"
import type {
    QuestAssistantRealtimeActions,
    QuestAssistantRealtimeState,
} from "./quest-assistant-realtime-application"
import { recordAndApplyQuestAssistantSyncActions } from "./quest-assistant-realtime-application"
import {
    type QuestAssistantRealtimeProjection,
    readQuestAssistantRealtimeProjection,
    readQuestAssistantSyncMetadata,
    resetQuestAssistantRealtimeLocalData,
    shouldResetQuestAssistantRealtimeProjectionCache,
} from "./quest-assistant-realtime-log.client"

const ASSISTANT_SYNC_BATCH_LIMIT = 200

interface RunQuestAssistantSyncBootstrapInput {
    userId: string
    latestSyncId?: number
    shouldApply: () => boolean
    getState: () => QuestAssistantRealtimeState
    actions: QuestAssistantRealtimeActions
    hydrateProjection: (projection: QuestAssistantRealtimeProjection) => void
    onError: (message: string, error: unknown) => void
}

interface ApplyQuestAssistantSyncBootstrapBatchInput {
    userId: string
    after: number
    result: Awaited<ReturnType<typeof fetchAssistantSyncActions>>
    shouldApply: () => boolean
    getState: () => QuestAssistantRealtimeState
    actions: QuestAssistantRealtimeActions
    onError: (message: string, error: unknown) => void
}

type QuestAssistantSyncBootstrapBatchResult =
    | {
          shouldContinue: false
      }
    | {
          shouldContinue: true
          nextAfter: number
      }

export async function runQuestAssistantSyncBootstrap(
    input: RunQuestAssistantSyncBootstrapInput
): Promise<void> {
    const initialProjection = await readQuestAssistantRealtimeProjection({
        userId: input.userId,
    })
    const metadata =
        initialProjection?.meta ?? (await readQuestAssistantSyncMetadata({ userId: input.userId }))
    let after = metadata?.lastSyncId ?? 0

    if (input.shouldApply() && initialProjection) {
        input.hydrateProjection(initialProjection)
    }

    if (
        shouldResetQuestAssistantRealtimeProjectionCache({
            metadata,
            projection: initialProjection,
        })
    ) {
        const didResetLocalData = await resetQuestAssistantRealtimeLocalData({
            userId: input.userId,
        })

        if (!didResetLocalData) {
            input.onError("Failed to reset incoherent assistant realtime projection cache", {
                lastSyncId: after,
            })
        }
        after = 0
    }

    if (input.latestSyncId === undefined || input.latestSyncId > after || after === 0) {
        await runQuestAssistantSyncDeltaReplay({
            userId: input.userId,
            after,
            shouldApply: input.shouldApply,
            getState: input.getState,
            actions: input.actions,
            onError: input.onError,
        })
    }

    const finalProjection = await readQuestAssistantRealtimeProjection({
        userId: input.userId,
    })
    if (input.shouldApply() && finalProjection) {
        input.hydrateProjection(finalProjection)
    }
}

async function runQuestAssistantSyncDeltaReplay(input: {
    userId: string
    after: number
    shouldApply: () => boolean
    getState: () => QuestAssistantRealtimeState
    actions: QuestAssistantRealtimeActions
    onError: (message: string, error: unknown) => void
}) {
    let after = input.after

    while (true) {
        const result = await fetchAssistantSyncActions({
            after,
            limit: ASSISTANT_SYNC_BATCH_LIMIT,
        })
        const batchResult = await applyQuestAssistantSyncBootstrapBatch({
            userId: input.userId,
            after,
            result,
            shouldApply: input.shouldApply,
            getState: input.getState,
            actions: input.actions,
            onError: input.onError,
        })

        if (!batchResult.shouldContinue) return

        after = batchResult.nextAfter
    }
}

async function applyQuestAssistantSyncBootstrapBatch(
    input: ApplyQuestAssistantSyncBootstrapBatchInput
): Promise<QuestAssistantSyncBootstrapBatchResult> {
    if (input.result.actions.length === 0) return { shouldContinue: false }

    const recordResult = await recordAndApplyQuestAssistantSyncActions({
        userId: input.userId,
        syncActions: input.result.actions,
        shouldApply: input.shouldApply,
        getState: input.getState,
        actions: input.actions,
    })

    if (recordResult.status === "gap") {
        input.onError("Assistant sync gap remained after recovery", {
            after: input.after,
            firstSyncId: input.result.firstSyncId,
            lastSyncId: input.result.lastSyncId,
        })
        return { shouldContinue: false }
    }

    if (recordResult.status === "failed") {
        input.onError("Assistant sync recovery failed to persist actions", {
            after: input.after,
            firstSyncId: input.result.firstSyncId,
            lastSyncId: input.result.lastSyncId,
            error: recordResult.error,
        })
        return { shouldContinue: false }
    }

    const nextAfter = input.result.actions[input.result.actions.length - 1]?.syncId ?? input.after
    if (nextAfter <= input.after) {
        input.onError("Assistant sync recovery made no cursor progress", {
            after: input.after,
            firstSyncId: input.result.firstSyncId,
            lastSyncId: input.result.lastSyncId,
        })
        return { shouldContinue: false }
    }

    return input.result.hasMore ? { shouldContinue: true, nextAfter } : { shouldContinue: false }
}
