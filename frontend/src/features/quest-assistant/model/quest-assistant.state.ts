import { makeAutoObservable, runInAction } from "mobx"
import { logError } from "@/shared/lib/error"
import {
    fetchAssistantAttachments,
    fetchRecentAssistantAttachments,
} from "../api/quest-assistant-attachments.api"
import type {
    AssistantAction,
    AssistantAttachment,
    AssistantConversation,
    AssistantConversationProjection,
} from "./quest-assistant"
import { mergeAssistantActions, upsertAssistantAction } from "./quest-assistant-action.state"
import {
    mergeAssistantConversationProjection,
    omitAssistantConversationTitle,
    removeAssistantConversation,
    removeAssistantConversations,
    replaceOptimisticAssistantConversation,
    replaceOptimisticAssistantConversationId,
    updateAssistantConversationTitle,
    upsertAssistantConversation,
} from "./quest-assistant-conversation.state"
import {
    mergeAssistantConversationProjections,
    removeAssistantConversationProjectionFromState,
    replaceOptimisticAssistantConversationProjection,
    replaceOptimisticAssistantConversationProjectionId,
    updateAssistantConversationProjectionTitle,
} from "./quest-assistant-projection.state"
import type {
    QuestAssistantRealtimeProjection,
    QuestAssistantRealtimeRecordResult,
} from "./quest-assistant-realtime-log.client"

export interface AssistantActiveRun {
    conversationId: string
    runId: string | null
}

export class QuestAssistantStore {
    conversations: AssistantConversation[] = []
    conversationProjections: AssistantConversationProjection[] = []
    actions: AssistantAction[] = []
    streamedConversationTitles: Record<string, string> = {}
    activeRun: AssistantActiveRun | null = null
    isCancellingRun = false
    deletedConversationIds: Set<string> = new Set()
    recentAttachments: AssistantAttachment[] = []
    attachmentLibraryAttachments: AssistantAttachment[] = []
    attachmentLibraryNextCursor: string | null = null
    attachmentLibraryHasMore = false
    attachmentLibrarySearch = ""
    conversationHistoryLoadRequests = 0
    isConversationLoadError = false
    isRecentAttachmentsLoading = false
    isAttachmentLibraryLoading = false
    isAttachmentLibraryFetchingNextPage = false

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true })
    }

    get proposedActions(): AssistantAction[] {
        return this.actions.filter((action) => action.status === "proposed")
    }

    get isConversationsLoading(): boolean {
        return this.conversationHistoryLoadRequests > 0
    }

    get isConversationHistoryInitialLoading(): boolean {
        return this.isConversationsLoading && this.conversations.length === 0
    }

    get isStreaming(): boolean {
        return this.activeRun !== null
    }

    startAssistantRun(input: { conversationId: string; runId?: string | null }): void {
        this.activeRun = {
            conversationId: input.conversationId,
            runId: input.runId ?? null,
        }
        this.isCancellingRun = false
    }

    acceptAssistantRun(input: {
        conversationId: string
        optimisticConversationId?: string | null
        runId: string
    }): void {
        if (!this.activeRun) return
        if (
            this.activeRun.conversationId !== input.conversationId &&
            this.activeRun.conversationId !== input.optimisticConversationId
        ) {
            return
        }

        this.activeRun = {
            conversationId: input.conversationId,
            runId: input.runId,
        }
        this.isCancellingRun = false
    }

    clearAssistantRun(): void {
        this.activeRun = null
        this.isCancellingRun = false
    }

    restoreAssistantRun(input: {
        activeRun: AssistantActiveRun | null
        isCancellingRun: boolean
    }): void {
        this.activeRun = input.activeRun
        this.isCancellingRun = input.isCancellingRun
    }

    startAssistantRunCancellation(): void {
        if (!this.activeRun?.runId) return

        this.isCancellingRun = true
    }

    finishAssistantRunCancellation(): void {
        this.isCancellingRun = false
    }

    beginConversationHistoryLoad(): void {
        this.conversationHistoryLoadRequests += 1
        this.isConversationLoadError = false
    }

    finishConversationHistoryLoad(input: { failed?: boolean } = {}): void {
        this.conversationHistoryLoadRequests = Math.max(0, this.conversationHistoryLoadRequests - 1)
        if (input.failed) {
            this.isConversationLoadError = true
        }
    }

    findConversation(conversationId: string | null): AssistantConversation | null {
        if (!conversationId) return null

        return this.conversations.find((conversation) => conversation.id === conversationId) ?? null
    }

    findConversationProjection(
        conversationId: string | null
    ): AssistantConversationProjection | null {
        if (!conversationId) return null

        return (
            this.conversationProjections.find((projection) => projection.id === conversationId) ??
            null
        )
    }

    getConversationTitle(input: {
        selectedConversationId: string | null
        selectedConversation: AssistantConversation | null
        selectedConversationProjection: AssistantConversationProjection | null
        defaultTitle: string
    }): string {
        if (!input.selectedConversationId) return input.defaultTitle

        const streamedTitle = this.streamedConversationTitles[input.selectedConversationId]
        if (streamedTitle) return streamedTitle

        return (
            input.selectedConversationProjection?.summary ??
            input.selectedConversation?.title ??
            "Assistant chat"
        )
    }

    async loadRecentAttachments(): Promise<void> {
        if (this.isRecentAttachmentsLoading) return

        this.isRecentAttachmentsLoading = true
        try {
            const attachments = await fetchRecentAssistantAttachments(3)
            runInAction(() => {
                this.recentAttachments = attachments
            })
        } catch (error) {
            logError("Failed to load recent assistant attachments", error)
        } finally {
            runInAction(() => {
                this.isRecentAttachmentsLoading = false
            })
        }
    }

    async loadAttachmentLibrary(input: { search: string; reset: boolean }): Promise<void> {
        const search = input.search.trim()
        const isSameSearch = search === this.attachmentLibrarySearch
        if (!input.reset && isSameSearch && !this.attachmentLibraryHasMore) return

        if (input.reset || !isSameSearch) {
            this.attachmentLibrarySearch = search
            this.attachmentLibraryAttachments = []
            this.attachmentLibraryNextCursor = null
            this.attachmentLibraryHasMore = false
            this.isAttachmentLibraryLoading = true
        } else {
            if (this.isAttachmentLibraryFetchingNextPage) return
            this.isAttachmentLibraryFetchingNextPage = true
        }

        try {
            const page = await fetchAssistantAttachments({
                limit: 24,
                cursor: input.reset || !isSameSearch ? null : this.attachmentLibraryNextCursor,
                search,
            })

            runInAction(() => {
                this.attachmentLibraryAttachments =
                    input.reset || !isSameSearch
                        ? page.attachments
                        : [...this.attachmentLibraryAttachments, ...page.attachments]
                this.attachmentLibraryNextCursor = page.nextCursor
                this.attachmentLibraryHasMore = page.hasMore
            })
        } catch (error) {
            logError("Failed to load assistant attachment library", error)
        } finally {
            runInAction(() => {
                this.isAttachmentLibraryLoading = false
                this.isAttachmentLibraryFetchingNextPage = false
            })
        }
    }

    hydrateProjection(projection: QuestAssistantRealtimeProjection): void {
        this.applyDeletedConversationProjection(
            projection.deletedConversations.map((tombstone) => tombstone.conversationId)
        )
        this.mergeConversationProjections(projection.conversationProjections)
        this.mergeActions(projection.actions)
    }

    applyDeletedConversationProjection(conversationIds: string[]): void {
        if (conversationIds.length === 0) return

        for (const conversationId of conversationIds) {
            this.deletedConversationIds.add(conversationId)
        }
        this.conversations = removeAssistantConversations(this.conversations, conversationIds)
        this.conversationProjections = this.conversationProjections.filter(
            (projection) => !conversationIds.includes(projection.id)
        )
        this.actions = this.actions.filter(
            (action) => !conversationIds.includes(action.conversationId ?? "")
        )

        for (const conversationId of conversationIds) {
            this.streamedConversationTitles = omitAssistantConversationTitle(
                this.streamedConversationTitles,
                conversationId
            )
        }
    }

    mergeConversationProjections(projections: AssistantConversationProjection[]): void {
        if (projections.length === 0) return

        const projectedConversations = projections.map(toAssistantConversationFromProjection)
        this.conversations = mergeAssistantConversationProjection(
            this.conversations,
            projectedConversations
        )
        this.streamedConversationTitles = {
            ...this.streamedConversationTitles,
            ...Object.fromEntries(
                projectedConversations.map((conversation) => [conversation.id, conversation.title])
            ),
        }
        this.conversationProjections = mergeAssistantConversationProjections(
            this.conversationProjections,
            projections
        )
    }

    mergeActions(actions: AssistantAction[]): void {
        this.actions = mergeAssistantActions(this.actions, actions)
    }

    updateConversations(
        updater: (conversations: AssistantConversation[]) => AssistantConversation[]
    ): void {
        this.conversations = updater(this.conversations)
    }

    updateConversationProjections(
        updater: (
            projections: AssistantConversationProjection[]
        ) => AssistantConversationProjection[]
    ): void {
        this.conversationProjections = updater(this.conversationProjections)
    }

    updateActions(updater: (actions: AssistantAction[]) => AssistantAction[]): void {
        this.actions = updater(this.actions)
    }

    updateStreamedConversationTitles(
        updater: (titles: Record<string, string>) => Record<string, string>
    ): void {
        this.streamedConversationTitles = updater(this.streamedConversationTitles)
    }

    removeConversation(conversationId: string): void {
        this.conversations = removeAssistantConversation(this.conversations, conversationId)
        this.conversationProjections = removeAssistantConversationProjectionFromState(
            this.conversationProjections,
            conversationId
        )
        this.actions = this.actions.filter((action) => action.conversationId !== conversationId)
        this.streamedConversationTitles = omitAssistantConversationTitle(
            this.streamedConversationTitles,
            conversationId
        )
    }

    rememberDeletedConversation(conversationId: string): void {
        this.deletedConversationIds.add(conversationId)
        this.removeConversation(conversationId)
    }

    forgetDeletedConversation(conversationId: string): void {
        this.deletedConversationIds.delete(conversationId)
    }

    updateConversationTitle(conversationId: string, title: string): void {
        this.streamedConversationTitles = {
            ...this.streamedConversationTitles,
            [conversationId]: title,
        }
        this.conversations = updateAssistantConversationTitle(
            this.conversations,
            conversationId,
            title
        )
        this.conversationProjections = updateAssistantConversationProjectionTitle(
            this.conversationProjections,
            conversationId,
            title
        )
    }

    upsertConversation(conversation: AssistantConversation): void {
        this.conversations = upsertAssistantConversation(this.conversations, conversation)
    }

    replaceOptimisticConversation(input: {
        optimisticConversationId: string
        conversation: AssistantConversation
    }): void {
        this.conversations = replaceOptimisticAssistantConversation(
            this.conversations,
            input.optimisticConversationId,
            input.conversation
        )
        this.conversationProjections = replaceOptimisticAssistantConversationProjection(
            this.conversationProjections,
            input.optimisticConversationId,
            input.conversation
        )
    }

    replaceOptimisticConversationId(input: {
        optimisticConversationId: string
        conversationId: string
        userId: string
        organizationId: string | undefined
        createdAt: string
    }): void {
        this.conversations = replaceOptimisticAssistantConversationId({
            conversations: this.conversations,
            optimisticConversationId: input.optimisticConversationId,
            conversationId: input.conversationId,
        })
        this.conversationProjections = replaceOptimisticAssistantConversationProjectionId({
            projections: this.conversationProjections,
            optimisticConversationId: input.optimisticConversationId,
            conversationId: input.conversationId,
            userId: input.userId,
            organizationId: input.organizationId,
            createdAt: input.createdAt,
        })
    }

    upsertAction(action: AssistantAction): void {
        this.actions = upsertAssistantAction(this.actions, action)
    }

    restoreSnapshot(input: {
        conversations: AssistantConversation[]
        conversationProjections: AssistantConversationProjection[]
        actions: AssistantAction[]
        streamedConversationTitles: Record<string, string>
    }): void {
        this.conversations = input.conversations
        this.conversationProjections = input.conversationProjections
        this.actions = input.actions
        this.streamedConversationTitles = input.streamedConversationTitles
    }

    handleRecordResult(recordResult: QuestAssistantRealtimeRecordResult, failureMessage: string) {
        if (recordResult.status === "failed") {
            logError(failureMessage, recordResult.error)
        }
    }
}

function toAssistantConversationFromProjection(
    projection: AssistantConversationProjection
): AssistantConversation {
    return {
        id: projection.id,
        userId: projection.userId,
        organizationId: projection.organizationId,
        title: projection.summary,
        lastRoutePath: projection.lastRoutePath,
        createdAt: projection.createdAt,
        updatedAt: projection.updatedAt,
    }
}
