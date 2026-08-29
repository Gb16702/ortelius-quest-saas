import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { History, Plus, Send, Sparkles, Square, Star, Trash2 } from "lucide-react"
import { observer } from "mobx-react-lite"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import {
    type FavoritesResponse,
    favoriteKeys,
    useFavorites,
    useFavoriteToggle,
} from "@/entities/favorite"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import { logError } from "@/shared/lib/error"
import { CONVERSATION_ATTACHMENT_FILE_CONFIG } from "@/shared/lib/file-upload/conversation-attachment-policy"
import { generateUUID } from "@/shared/lib/uuid"
import { Button } from "@/shared/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/ui/dialog"
import { Textarea } from "@/shared/ui/textarea"
import { showErrorToast, showPromiseToast } from "@/shared/ui/toasts"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { cancelAssistantAction, confirmAssistantAction } from "../api/quest-assistant-actions.api"
import {
    uploadAssistantAttachments,
    validateAssistantAttachmentFiles,
} from "../api/quest-assistant-attachments.api"
import { deleteAssistantConversation } from "../api/quest-assistant-conversations.api"
import { sendAssistantMessage } from "../api/quest-assistant-message-command"
import { cancelAssistantRun } from "../api/quest-assistant-runs.api"
import { appendUniqueAssistantAttachments } from "../lib/quest-assistant-attachments"
import type {
    AssistantAction,
    AssistantAttachment,
    AssistantConversation,
    AssistantConversationPart,
    AssistantConversationProjection,
    AssistantConversationProjectionPart,
    AssistantMessage,
} from "../model/quest-assistant"
import { type AssistantActiveRun, QuestAssistantStore } from "../model/quest-assistant.state"
import { getActionRoutePath } from "../model/quest-assistant-action.state"
import {
    createAssistantConversationProjectionFallback,
    createOptimisticAssistantConversation,
    DEFAULT_ASSISTANT_CONVERSATION_TITLE,
    getAssistantActiveConversationId,
    getAssistantPromptProjectionConversation,
    omitAssistantConversationTitle,
    removeAssistantConversation,
} from "../model/quest-assistant-conversation.state"
import {
    createOptimisticAssistantConversationFavorite,
    removeAssistantConversationFavorite,
} from "../model/quest-assistant-favorites"
import { canSubmitAssistantMessage } from "../model/quest-assistant-message-submit"
import { subscribeQuestAssistantConversationOpen } from "../model/quest-assistant-open-conversation.client"
import {
    appendAssistantConversationProjectionPartDelta,
    completeAssistantConversationProjectionPart,
    failAssistantConversationProjectionRun,
    finishAssistantConversationProjectionRun,
    removeAssistantConversationProjectionFromState,
    removeAssistantConversationProjectionPartsFromState,
    upsertAssistantConversationProjectionPart,
} from "../model/quest-assistant-projection.state"
import {
    reconcileAssistantPromptProjectionConversation,
    recordAssistantPromptProjection,
    rollbackAssistantPromptProjection,
} from "../model/quest-assistant-prompt-projection"
import {
    parseQuestAssistantLiveDeltaMessage,
    parseQuestAssistantSyncAvailableMessage,
} from "../model/quest-assistant-realtime"
import {
    hydrateQuestAssistantRealtimeProjection,
    type QuestAssistantRealtimeActions,
    type QuestAssistantRealtimeState,
} from "../model/quest-assistant-realtime-application"
import { createQuestAssistantRealtimeEventQueue } from "../model/quest-assistant-realtime-event-queue"
import {
    clearQuestAssistantConversationOptimisticDeletion,
    createAssistantPromptProjectionPart,
    normalizeAssistantProjectionPart,
    type QuestAssistantRealtimeProjection,
    recordQuestAssistantConversationOptimisticDeletion,
} from "../model/quest-assistant-realtime-log.client"
import { buildAssistantRuntimeContext, getErrorMessage } from "../model/quest-assistant-runtime"
import { runQuestAssistantSyncBootstrap } from "../model/quest-assistant-sync-bootstrap.client"
import {
    getAssistantThreadTargetFromSearch,
    QUEST_ASSISTANT_NEW_THREAD_VALUE,
    removeAssistantConversationParamFromLocation,
    setAssistantThreadParamInLocation,
} from "../model/quest-assistant-url"
import {
    AssistantAttachmentLibraryDialog,
    AssistantAttachmentMenu,
    AssistantComposerAttachments,
} from "./assistant-attachments"
import { AssistantConversationPanel } from "./assistant-conversation-panel"

interface QuestAssistantEntryProps {
    organizationId?: string
    userId?: string | null
}

const ASSISTANT_SYNC_NOTIFICATION_DEBOUNCE_MS = 120

interface DeleteAssistantConversationMutationContext {
    previousConversations: AssistantConversation[]
    previousSelectedConversationId: string | null
    previousLocallyManagedConversationId: string | null
    previousConversationProjections: AssistantConversationProjection[]
    previousActions: AssistantAction[]
    previousStreamedConversationTitles: Record<string, string>
    previousActiveRun: AssistantActiveRun | null
    previousIsCancellingRun: boolean
    previousPendingActionId: string | null
    previousDraft: string
    previousPendingOptimisticConversationId: string | null
    previousFavorites: FavoritesResponse["data"] | undefined
    wasActiveConversation: boolean
}

function toAssistantConversationPartFromMessage(
    message: AssistantMessage
): AssistantConversationPart {
    const runId = message.metadata?.runId

    return {
        id: message.id,
        conversationId: message.conversationId,
        runId: typeof runId === "string" ? runId : null,
        type: message.role === "user" ? "prompt" : "text",
        role: message.role,
        status: "completed",
        content: message.content,
        ...(message.metadata ? { metadata: message.metadata } : {}),
        createdAt: message.createdAt,
        updatedAt: message.createdAt,
    }
}

interface ApplyQuestAssistantLiveDeltaMessageInput {
    message: unknown
    getState: () => QuestAssistantRealtimeState
    getActions: () => QuestAssistantRealtimeActions | null
}

function applyQuestAssistantLiveDeltaMessage(input: ApplyQuestAssistantLiveDeltaMessageInput) {
    const liveDelta = parseQuestAssistantLiveDeltaMessage(input.message)
    if (liveDelta.type === "ignored") return false

    if (liveDelta.type === "invalid") {
        logError(`Invalid ${liveDelta.messageType} WebSocket payload`, liveDelta.error)
        return true
    }

    const state = input.getState()
    const actions = input.getActions()
    const shouldApplyLiveDelta = state.selectedConversationId
        ? liveDelta.conversationId === state.selectedConversationId ||
          liveDelta.conversationId === state.locallyManagedConversationId
        : state.isStreaming

    if (
        actions &&
        shouldApplyLiveDelta &&
        !state.deletedConversationIds.has(liveDelta.conversationId)
    ) {
        actions.applyAssistantPartDelta({
            conversationId: liveDelta.conversationId,
            partId: liveDelta.partId,
            delta: liveDelta.delta,
            content: liveDelta.content,
        })
    }

    return true
}

export const QuestAssistantEntry = observer(function QuestAssistantEntry({
    organizationId,
    userId,
}: QuestAssistantEntryProps) {
    const [assistantStore] = useState(() => new QuestAssistantStore())
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const assistantLocation = useLocation({
        select: (location) => ({
            pathname: location.pathname,
            search: location.searchStr,
            hash: location.hash,
        }),
    })
    const { subscribe } = useWebSocket()
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState("")
    const [selectedAttachments, setSelectedAttachments] = useState<AssistantAttachment[]>([])
    const [uploadingFiles, setUploadingFiles] = useState<File[]>([])
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
    const [attachmentLibraryOpen, setAttachmentLibraryOpen] = useState(false)
    const [attachmentLibrarySearch, setAttachmentLibrarySearch] = useState("")
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const [locallyManagedConversationId, setLocallyManagedConversationId] = useState<string | null>(
        null
    )
    const [pendingActionId, setPendingActionId] = useState<string | null>(null)
    const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null)
    const pendingNewConversationIdRef = useRef<string | null>(null)
    const pendingOptimisticConversationIdRef = useRef<string | null>(null)
    const pendingAssistantLatestSyncIdRef = useRef<number | null>(null)
    const syncRecoveryPromiseRef = useRef<Promise<void> | null>(null)
    const syncRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastHandledAssistantThreadParamRef = useRef<string | null>(null)
    const attachmentInputRef = useRef<HTMLInputElement | null>(null)
    const deletedConversationIdsRef = useRef<Set<string>>(new Set())
    const confirmedDeletedConversationIdsRef = useRef<Set<string>>(new Set())
    const realtimeStateRef = useRef<QuestAssistantRealtimeState>({
        isStreaming: assistantStore.isStreaming,
        locallyManagedConversationId: null,
        selectedConversationId: null,
        deletedConversationIds: deletedConversationIdsRef.current,
    })
    const realtimeActionsRef = useRef<QuestAssistantRealtimeActions | null>(null)

    const favoritesQuery = useFavorites(organizationId)
    const favoriteToggleMutation = useFavoriteToggle()
    const deferredAttachmentLibrarySearch = useDeferredValue(attachmentLibrarySearch)
    const conversations = assistantStore.conversations
    const assistantThreadTargetFromLocation = useMemo(
        () => getAssistantThreadTargetFromSearch(assistantLocation.search),
        [assistantLocation.search]
    )
    const requestedConversationId =
        assistantThreadTargetFromLocation?.kind === "conversation"
            ? assistantThreadTargetFromLocation.value
            : null
    const activeConversationId = getAssistantActiveConversationId({
        selectedConversationId,
        requestedConversationId,
        deletedConversationIds: assistantStore.deletedConversationIds,
    })
    const recentAttachments = assistantStore.recentAttachments
    const libraryAttachments = assistantStore.attachmentLibraryAttachments
    const selectedAttachmentIds = useMemo(
        () => new Set(selectedAttachments.map((attachment) => attachment.id)),
        [selectedAttachments]
    )
    const proposedActions = assistantStore.proposedActions
    const selectedConversation = assistantStore.findConversation(selectedConversationId)
    const selectedConversationProjection =
        assistantStore.findConversationProjection(activeConversationId)
    const selectedTitle = assistantStore.getConversationTitle({
        selectedConversationId,
        selectedConversation,
        selectedConversationProjection,
        defaultTitle: DEFAULT_ASSISTANT_CONVERSATION_TITLE,
    })
    const activeRun = assistantStore.activeRun
    const isCancellingRun = assistantStore.isCancellingRun
    const isStreaming = assistantStore.isStreaming

    const replaceAssistantThreadParam = useCallback(
        (threadTarget: string) => {
            const nextHref = setAssistantThreadParamInLocation(assistantLocation, threadTarget)
            void navigate({ href: nextHref, replace: true })
        },
        [assistantLocation, navigate]
    )

    const rememberDeletedConversation = useCallback(
        (conversationId: string) => {
            assistantStore.rememberDeletedConversation(conversationId)
            if (deletedConversationIdsRef.current.has(conversationId)) return

            const deletedConversationIds = new Set(deletedConversationIdsRef.current)
            deletedConversationIds.add(conversationId)
            deletedConversationIdsRef.current = deletedConversationIds
            realtimeStateRef.current = {
                ...realtimeStateRef.current,
                deletedConversationIds,
            }
        },
        [assistantStore]
    )

    const forgetDeletedConversation = useCallback(
        (conversationId: string) => {
            assistantStore.forgetDeletedConversation(conversationId)
            if (!deletedConversationIdsRef.current.has(conversationId)) return

            const deletedConversationIds = new Set(deletedConversationIdsRef.current)
            deletedConversationIds.delete(conversationId)
            deletedConversationIdsRef.current = deletedConversationIds
            realtimeStateRef.current = {
                ...realtimeStateRef.current,
                deletedConversationIds,
            }
        },
        [assistantStore]
    )

    const confirmDeletedConversation = useCallback((conversationId: string) => {
        confirmedDeletedConversationIdsRef.current = new Set([
            ...confirmedDeletedConversationIdsRef.current,
            conversationId,
        ])
    }, [])

    const resetDeletedConversationState = useCallback(
        (conversationId: string) => {
            const currentState = realtimeStateRef.current
            const isActiveConversation =
                currentState.selectedConversationId === conversationId ||
                currentState.locallyManagedConversationId === conversationId ||
                requestedConversationId === conversationId

            assistantStore.updateActions((actions) =>
                actions.filter((action) => action.conversationId !== conversationId)
            )
            assistantStore.updateStreamedConversationTitles((titles) =>
                omitAssistantConversationTitle(titles, conversationId)
            )

            if (!isActiveConversation) return

            setSelectedConversationId(null)
            setLocallyManagedConversationId(null)
            assistantStore.updateConversationProjections((projections) =>
                removeAssistantConversationProjectionFromState(projections, conversationId)
            )
            assistantStore.updateActions(() => [])
            assistantStore.clearAssistantRun()
            setDraft("")
            setSelectedAttachments([])
            setUploadingFiles([])
            setPendingActionId(null)

            if (pendingOptimisticConversationIdRef.current === conversationId) {
                pendingOptimisticConversationIdRef.current = null
            }

            replaceAssistantThreadParam(QUEST_ASSISTANT_NEW_THREAD_VALUE)
        },
        [assistantStore, replaceAssistantThreadParam, requestedConversationId]
    )

    const applyConversationDeleted = useCallback(
        ({ conversationId }: { conversationId: string; deletedAt: string }) => {
            confirmDeletedConversation(conversationId)
            rememberDeletedConversation(conversationId)
            resetDeletedConversationState(conversationId)
        },
        [confirmDeletedConversation, rememberDeletedConversation, resetDeletedConversationState]
    )

    const applyConversationTitleUpdate = useCallback(
        ({ conversationId, title }: { conversationId: string; title: string }) => {
            if (deletedConversationIdsRef.current.has(conversationId)) return

            assistantStore.updateConversationTitle(conversationId, title)
        },
        [assistantStore]
    )

    const applyConversationCreated = useCallback(
        (conversation: AssistantConversation) => {
            if (deletedConversationIdsRef.current.has(conversation.id)) return

            const optimisticConversationId = pendingOptimisticConversationIdRef.current

            if (optimisticConversationId) {
                assistantStore.replaceOptimisticConversation({
                    optimisticConversationId,
                    conversation,
                })
                pendingOptimisticConversationIdRef.current = null
                setLocallyManagedConversationId((conversationId) =>
                    conversationId === optimisticConversationId ? conversation.id : conversationId
                )
                return
            }

            assistantStore.upsertConversation(conversation)
        },
        [assistantStore]
    )

    const applyAssistantActionUpdate = useCallback(
        (action: AssistantAction, envelopeConversationId?: string | null) => {
            const conversationId = action.conversationId ?? envelopeConversationId ?? null
            if (conversationId && deletedConversationIdsRef.current.has(conversationId)) return

            const nextAction =
                conversationId && action.conversationId !== conversationId
                    ? { ...action, conversationId }
                    : action

            assistantStore.upsertAction(nextAction)
        },
        [assistantStore]
    )

    const applyAssistantMessageInserted = useCallback(
        (message: AssistantMessage) => {
            if (deletedConversationIdsRef.current.has(message.conversationId)) return

            const part = toAssistantConversationPartFromMessage(message)
            assistantStore.updateConversationProjections((projections) =>
                upsertAssistantConversationProjectionPart({
                    projections,
                    conversation: createAssistantConversationProjectionFallback({
                        conversationId: message.conversationId,
                        selectedConversation,
                        selectedTitle,
                        userId,
                        organizationId,
                        createdAt: message.createdAt,
                    }),
                    part: normalizeAssistantProjectionPart({
                        part,
                        userId: userId ?? "pending-user",
                    }),
                    status: message.role === "assistant" ? "complete" : "streaming",
                    updatedAt: message.createdAt,
                })
            )
        },
        [assistantStore, organizationId, selectedConversation, selectedTitle, userId]
    )

    const applyAssistantPartStarted = useCallback(
        (part: AssistantConversationPart) => {
            assistantStore.updateConversationProjections((projections) =>
                upsertAssistantConversationProjectionPart({
                    projections,
                    conversation: createAssistantConversationProjectionFallback({
                        conversationId: part.conversationId,
                        selectedConversation,
                        selectedTitle,
                        userId,
                        organizationId,
                        createdAt: part.createdAt,
                    }),
                    part: normalizeAssistantProjectionPart({
                        part,
                        userId: userId ?? "pending-user",
                    }),
                    status: "streaming",
                    updatedAt: part.updatedAt,
                })
            )
        },
        [assistantStore, organizationId, selectedConversation, selectedTitle, userId]
    )

    const applyAssistantPartDelta = useCallback(
        ({
            conversationId,
            content,
            partId,
            delta,
        }: {
            conversationId: string
            content?: string
            partId: string
            delta: string
        }) => {
            assistantStore.updateConversationProjections((projections) =>
                appendAssistantConversationProjectionPartDelta({
                    projections,
                    conversation: createAssistantConversationProjectionFallback({
                        conversationId,
                        selectedConversation,
                        selectedTitle,
                        userId,
                        organizationId,
                        createdAt: new Date().toISOString(),
                    }),
                    partId,
                    delta,
                    content,
                })
            )
        },
        [assistantStore, organizationId, selectedConversation, selectedTitle, userId]
    )

    const applyAssistantPartCompleted = useCallback(
        ({
            conversationId,
            partId,
            content,
        }: {
            conversationId: string
            partId: string
            content?: string
        }) => {
            assistantStore.updateConversationProjections((projections) =>
                completeAssistantConversationProjectionPart({
                    projections,
                    conversationId,
                    partId,
                    content,
                    updatedAt: new Date().toISOString(),
                })
            )
        },
        [assistantStore]
    )

    const completeAssistantRun = useCallback(
        (conversationId: string) => {
            assistantStore.updateConversationProjections((projections) =>
                finishAssistantConversationProjectionRun(projections, conversationId)
            )
            setLocallyManagedConversationId(null)
            assistantStore.clearAssistantRun()
        },
        [assistantStore]
    )

    const failAssistantRun = useCallback(
        ({
            conversationId,
            message,
            code,
        }: {
            conversationId: string
            message: string
            code?: string
        }) => {
            if (code !== "run_cancelled") {
                showErrorToast(message)
            }
            assistantStore.updateConversationProjections((projections) =>
                failAssistantConversationProjectionRun(projections, conversationId)
            )
            setLocallyManagedConversationId(null)
            assistantStore.clearAssistantRun()
        },
        [assistantStore]
    )

    const resetAssistantConversationState = useCallback(
        ({ clearDraft }: { clearDraft: boolean }) => {
            pendingNewConversationIdRef.current = null
            setSelectedConversationId(null)
            setLocallyManagedConversationId(null)
            assistantStore.updateActions(() => [])
            if (clearDraft) {
                setDraft("")
            }
            setSelectedAttachments([])
            setUploadingFiles([])
            setPendingActionId(null)
            assistantStore.clearAssistantRun()
        },
        [assistantStore]
    )

    const selectLocalConversation = useCallback((conversationId: string) => {
        setSelectedConversationId(conversationId)
        setLocallyManagedConversationId(conversationId)
    }, [])

    const hydrateAssistantProjection = useCallback(
        (projection: QuestAssistantRealtimeProjection) => {
            hydrateQuestAssistantRealtimeProjection({
                projection,
                selectedConversationId,
                rememberDeletedConversation,
                confirmDeletedConversation,
                resetDeletedConversationState,
                applyDeletedConversationProjection:
                    assistantStore.applyDeletedConversationProjection,
                mergeConversationProjections: assistantStore.mergeConversationProjections,
                mergeActions: assistantStore.mergeActions,
            })
            const currentProjection = projection.conversationProjections.find(
                (conversationProjection) => conversationProjection.id === selectedConversationId
            )
            if (
                currentProjection?.status === "complete" ||
                currentProjection?.status === "failed"
            ) {
                setLocallyManagedConversationId(null)
                assistantStore.clearAssistantRun()
            }
        },
        [
            assistantStore,
            confirmDeletedConversation,
            rememberDeletedConversation,
            resetDeletedConversationState,
            selectedConversationId,
        ]
    )

    const openAssistantNewThread = useCallback(() => {
        setOpen(true)

        if (isStreaming) return

        resetAssistantConversationState({ clearDraft: false })
        pendingNewConversationIdRef.current = generateUUID()
    }, [isStreaming, resetAssistantConversationState])

    const openAssistantConversation = useCallback(
        (conversationId: string) => {
            setOpen(true)

            if (isStreaming && conversationId === locallyManagedConversationId) {
                setSelectedConversationId(conversationId)
                return
            }

            if (
                isStreaming &&
                conversationId !== selectedConversationId &&
                conversationId !== locallyManagedConversationId
            ) {
                return
            }

            setSelectedConversationId(conversationId)
            setLocallyManagedConversationId(null)
            pendingNewConversationIdRef.current = null
            assistantStore.updateActions(() => [])
            setSelectedAttachments([])
            setUploadingFiles([])
            setPendingActionId(null)
            assistantStore.clearAssistantRun()
        },
        [assistantStore, isStreaming, locallyManagedConversationId, selectedConversationId]
    )

    const realtimeActions = useMemo<QuestAssistantRealtimeActions>(
        () => ({
            applyConversationCreated,
            selectLocalConversation,
            applyConversationTitleUpdate,
            applyConversationDeleted,
            applyAssistantMessageInserted,
            applyAssistantPartStarted,
            applyAssistantPartDelta,
            applyAssistantPartCompleted,
            applyAssistantActionUpdate,
            completeAssistantRun,
            failAssistantRun,
        }),
        [
            applyAssistantActionUpdate,
            applyAssistantMessageInserted,
            applyAssistantPartCompleted,
            applyAssistantPartDelta,
            applyAssistantPartStarted,
            applyConversationCreated,
            applyConversationDeleted,
            applyConversationTitleUpdate,
            completeAssistantRun,
            failAssistantRun,
            selectLocalConversation,
        ]
    )
    realtimeActionsRef.current = realtimeActions

    const recoverAssistantSync = useCallback(
        async (input: { latestSyncId?: number; shouldApply?: () => boolean } = {}) => {
            if (!userId) return

            const inFlightRecovery = syncRecoveryPromiseRef.current
            if (inFlightRecovery) {
                await inFlightRecovery

                return recoverAssistantSync(input)
            }

            const actions = realtimeActionsRef.current
            if (!actions) return

            const recoveryPromise = runQuestAssistantSyncBootstrap({
                userId,
                latestSyncId: input.latestSyncId,
                shouldApply: input.shouldApply ?? (() => true),
                getState: () => realtimeStateRef.current,
                actions,
                hydrateProjection: hydrateAssistantProjection,
                onError: logError,
            })

            syncRecoveryPromiseRef.current = recoveryPromise

            try {
                await recoveryPromise
            } finally {
                if (syncRecoveryPromiseRef.current === recoveryPromise) {
                    syncRecoveryPromiseRef.current = null
                }
            }
        },
        [hydrateAssistantProjection, userId]
    )

    const recoverAssistantSyncSafely = useCallback(
        (input: { latestSyncId?: number; shouldApply?: () => boolean } = {}) => {
            assistantStore.beginConversationHistoryLoad()

            let didFail = false
            void recoverAssistantSync(input)
                .catch((error) => {
                    didFail = true
                    logError("Failed to recover assistant sync", error)
                })
                .finally(() => {
                    assistantStore.finishConversationHistoryLoad({ failed: didFail })
                })
        },
        [assistantStore, recoverAssistantSync]
    )

    const runDeleteConversation = useCallback(
        async (conversationId: string) => {
            const context: DeleteAssistantConversationMutationContext = {
                previousConversations: [...assistantStore.conversations],
                previousSelectedConversationId: selectedConversationId,
                previousLocallyManagedConversationId: locallyManagedConversationId,
                previousConversationProjections: [...assistantStore.conversationProjections],
                previousActions: [...assistantStore.actions],
                previousStreamedConversationTitles: {
                    ...assistantStore.streamedConversationTitles,
                },
                previousActiveRun: assistantStore.activeRun,
                previousIsCancellingRun: assistantStore.isCancellingRun,
                previousPendingActionId: pendingActionId,
                previousDraft: draft,
                previousPendingOptimisticConversationId: pendingOptimisticConversationIdRef.current,
                previousFavorites: organizationId ? favoritesQuery.data : undefined,
                wasActiveConversation:
                    selectedConversationId === conversationId ||
                    locallyManagedConversationId === conversationId,
            }

            setDeletingConversationId(conversationId)
            if (organizationId) {
                queryClient.setQueryData<FavoritesResponse["data"]>(
                    favoriteKeys.list({ organizationId }),
                    (favorites) => removeAssistantConversationFavorite(favorites, conversationId)
                )
            }
            rememberDeletedConversation(conversationId)
            resetDeletedConversationState(conversationId)
            void recordQuestAssistantConversationOptimisticDeletion({
                userId,
                conversationId,
            }).then((recordResult) => {
                if (recordResult.status === "failed") {
                    logError(
                        "Failed to persist optimistic assistant conversation deletion",
                        recordResult.error
                    )
                }
            })

            try {
                await deleteAssistantConversation(conversationId)
            } catch (error) {
                const isConfirmedDeleted =
                    confirmedDeletedConversationIdsRef.current.has(conversationId)
                if (!isConfirmedDeleted) {
                    forgetDeletedConversation(conversationId)
                    void clearQuestAssistantConversationOptimisticDeletion({
                        userId,
                        conversationId,
                    })
                    assistantStore.restoreSnapshot({
                        conversations: context.previousConversations,
                        conversationProjections: context.previousConversationProjections,
                        actions: context.previousActions,
                        streamedConversationTitles: context.previousStreamedConversationTitles,
                    })
                    if (organizationId) {
                        queryClient.setQueryData(
                            favoriteKeys.list({ organizationId }),
                            context.previousFavorites
                        )
                    }

                    if (
                        context.wasActiveConversation &&
                        !realtimeStateRef.current.selectedConversationId
                    ) {
                        setSelectedConversationId(context.previousSelectedConversationId)
                        setLocallyManagedConversationId(
                            context.previousLocallyManagedConversationId
                        )
                        assistantStore.restoreAssistantRun({
                            activeRun: context.previousActiveRun,
                            isCancellingRun: context.previousIsCancellingRun,
                        })
                        setPendingActionId(context.previousPendingActionId)
                        setDraft(context.previousDraft)
                        pendingOptimisticConversationIdRef.current =
                            context.previousPendingOptimisticConversationId
                        replaceAssistantThreadParam(
                            context.previousSelectedConversationId ??
                                context.previousLocallyManagedConversationId ??
                                QUEST_ASSISTANT_NEW_THREAD_VALUE
                        )
                    }
                }

                throw error
            } finally {
                setDeletingConversationId(null)
            }
        },
        [
            assistantStore,
            draft,
            forgetDeletedConversation,
            favoritesQuery.data,
            locallyManagedConversationId,
            organizationId,
            pendingActionId,
            queryClient,
            rememberDeletedConversation,
            replaceAssistantThreadParam,
            resetDeletedConversationState,
            selectedConversationId,
            userId,
        ]
    )

    useEffect(() => {
        realtimeStateRef.current = {
            isStreaming,
            locallyManagedConversationId,
            selectedConversationId,
            deletedConversationIds: deletedConversationIdsRef.current,
        }
    }, [isStreaming, locallyManagedConversationId, selectedConversationId])

    useEffect(() => {
        return subscribeQuestAssistantConversationOpen((conversationId) => {
            replaceAssistantThreadParam(conversationId)
            openAssistantConversation(conversationId)
        })
    }, [openAssistantConversation, replaceAssistantThreadParam])

    useEffect(() => {
        if (!assistantThreadTargetFromLocation) {
            lastHandledAssistantThreadParamRef.current = null
            return
        }

        if (
            lastHandledAssistantThreadParamRef.current === assistantThreadTargetFromLocation.value
        ) {
            return
        }

        lastHandledAssistantThreadParamRef.current = assistantThreadTargetFromLocation.value
        if (assistantThreadTargetFromLocation.kind === "new") {
            openAssistantNewThread()
            return
        }

        openAssistantConversation(assistantThreadTargetFromLocation.value)
    }, [assistantThreadTargetFromLocation, openAssistantConversation, openAssistantNewThread])

    useEffect(() => {
        if (!open || !userId) return

        let isActive = true

        recoverAssistantSyncSafely({
            shouldApply: () => isActive,
        })

        return () => {
            isActive = false
        }
    }, [open, recoverAssistantSyncSafely, userId])

    useEffect(() => {
        let isActive = true
        const realtimeEventQueue = createQuestAssistantRealtimeEventQueue({
            onError: (error) => logError("Failed to process assistant realtime event", error),
        })
        const enqueueRecovery = () => {
            const latestSyncId = pendingAssistantLatestSyncIdRef.current
            pendingAssistantLatestSyncIdRef.current = null

            if (latestSyncId === null) return

            realtimeEventQueue.enqueue(async () => {
                await recoverAssistantSync({
                    latestSyncId,
                    shouldApply: () => isActive,
                })

                if (!isActive || pendingAssistantLatestSyncIdRef.current === null) return

                if (syncRecoveryTimerRef.current) {
                    clearTimeout(syncRecoveryTimerRef.current)
                }
                syncRecoveryTimerRef.current = setTimeout(() => {
                    syncRecoveryTimerRef.current = null
                    enqueueRecovery()
                }, ASSISTANT_SYNC_NOTIFICATION_DEBOUNCE_MS)
            })
        }

        const unsubscribe = subscribe((message) => {
            if (
                applyQuestAssistantLiveDeltaMessage({
                    message,
                    getState: () => realtimeStateRef.current,
                    getActions: () => realtimeActionsRef.current,
                })
            ) {
                return
            }

            const parsed = parseQuestAssistantSyncAvailableMessage(message)
            if (parsed.type === "ignored") return

            if (parsed.type === "invalid") {
                logError(`Invalid ${parsed.messageType} WebSocket payload`, parsed.error)
                return
            }

            pendingAssistantLatestSyncIdRef.current = Math.max(
                pendingAssistantLatestSyncIdRef.current ?? 0,
                parsed.latestSyncId
            )
            if (syncRecoveryTimerRef.current) return

            syncRecoveryTimerRef.current = setTimeout(() => {
                syncRecoveryTimerRef.current = null
                enqueueRecovery()
            }, ASSISTANT_SYNC_NOTIFICATION_DEBOUNCE_MS)
        })

        return () => {
            isActive = false
            if (syncRecoveryTimerRef.current) {
                clearTimeout(syncRecoveryTimerRef.current)
                syncRecoveryTimerRef.current = null
            }
            pendingAssistantLatestSyncIdRef.current = null
            unsubscribe()
        }
    }, [recoverAssistantSync, subscribe])

    const selectedAssistantConversationFavorite = useMemo(
        () =>
            selectedConversationId
                ? favoritesQuery.data?.favorites.find(
                      (favorite) =>
                          favorite.entityType === "assistant_conversation" &&
                          favorite.entityId === selectedConversationId
                  )
                : undefined,
        [favoritesQuery.data?.favorites, selectedConversationId]
    )
    const isSelectedAssistantConversationFavorited = Boolean(selectedAssistantConversationFavorite)
    const favoriteSelectedConversationLabel = isSelectedAssistantConversationFavorited
        ? "Remove favorite"
        : "Add favorite"
    const canToggleSelectedConversationFavorite = Boolean(
        organizationId &&
            selectedConversationId &&
            pendingOptimisticConversationIdRef.current !== selectedConversationId &&
            deletingConversationId !== selectedConversationId
    )
    const toggleSelectedConversationFavorite = useCallback(() => {
        if (!organizationId || !selectedConversationId || !canToggleSelectedConversationFavorite) {
            return
        }

        const optimisticFavorite =
            selectedAssistantConversationFavorite ??
            createOptimisticAssistantConversationFavorite({
                conversationId: selectedConversationId,
                organizationId,
                title: selectedTitle,
            })

        void favoriteToggleMutation
            .mutateAsync({
                entityType: "assistant_conversation",
                entityId: selectedConversationId,
                isFavorited: isSelectedAssistantConversationFavorited,
                organizationId,
                optimisticFavorite,
            })
            .catch(() => undefined)
    }, [
        canToggleSelectedConversationFavorite,
        favoriteToggleMutation,
        isSelectedAssistantConversationFavorited,
        organizationId,
        selectedAssistantConversationFavorite,
        selectedConversationId,
        selectedTitle,
    ])

    const startNewChat = () => {
        if (isStreaming) return

        resetAssistantConversationState({ clearDraft: true })
        pendingNewConversationIdRef.current = generateUUID()
        replaceAssistantThreadParam(QUEST_ASSISTANT_NEW_THREAD_VALUE)
    }

    const selectConversation = (conversation: AssistantConversation) => {
        if (isStreaming) return
        replaceAssistantThreadParam(conversation.id)
        pendingNewConversationIdRef.current = null
        setSelectedConversationId(conversation.id)
        setLocallyManagedConversationId(null)
        assistantStore.updateActions(() => [])
        setSelectedAttachments([])
        setUploadingFiles([])
        setPendingActionId(null)
        assistantStore.clearAssistantRun()
    }

    const deleteConversation = (conversationId: string) => {
        if (deletingConversationId) return
        const promise = runDeleteConversation(conversationId)

        void showPromiseToast(promise, {
            loading: "Deleting chat...",
            success: "Chat deleted",
            error: (error) => getErrorMessage(error),
        })
    }

    const addSelectedAttachment = useCallback(
        (attachment: AssistantAttachment) => {
            if (selectedAttachmentIds.has(attachment.id)) return

            const selectedCount = selectedAttachments.length + uploadingFiles.length
            if (selectedCount >= CONVERSATION_ATTACHMENT_FILE_CONFIG.maxFiles) {
                showErrorToast(
                    `You can attach up to ${CONVERSATION_ATTACHMENT_FILE_CONFIG.maxFiles} files.`
                )
                return
            }

            setSelectedAttachments((attachments) => [...attachments, attachment])
        },
        [selectedAttachmentIds, selectedAttachments.length, uploadingFiles.length]
    )

    const removeSelectedAttachment = useCallback((attachmentId: string) => {
        setSelectedAttachments((attachments) =>
            attachments.filter((attachment) => attachment.id !== attachmentId)
        )
    }, [])

    const chooseAttachmentFiles = useCallback(() => {
        if (isStreaming) return
        attachmentInputRef.current?.click()
    }, [isStreaming])

    const handleAttachmentFilesSelected = useCallback(
        async (fileList: FileList | null) => {
            const files = Array.from(fileList ?? [])
            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = ""
            }
            if (files.length === 0) return

            const validationMessage = validateAssistantAttachmentFiles({
                files,
                selectedCount: selectedAttachments.length + uploadingFiles.length,
            })
            if (validationMessage) {
                showErrorToast(validationMessage)
                return
            }

            setUploadingFiles((currentFiles) => [...currentFiles, ...files])

            try {
                const uploadedAttachments = await uploadAssistantAttachments({
                    files,
                    organizationId,
                })
                setSelectedAttachments((attachments) =>
                    appendUniqueAssistantAttachments(attachments, uploadedAttachments)
                )
                void assistantStore.loadRecentAttachments()
                if (attachmentLibraryOpen) {
                    void assistantStore.loadAttachmentLibrary({
                        search: deferredAttachmentLibrarySearch,
                        reset: true,
                    })
                }
            } catch (error) {
                showErrorToast(getErrorMessage(error))
            } finally {
                setUploadingFiles((currentFiles) =>
                    currentFiles.filter((file) => !files.includes(file))
                )
            }
        },
        [
            assistantStore,
            attachmentLibraryOpen,
            deferredAttachmentLibrarySearch,
            organizationId,
            selectedAttachments.length,
            uploadingFiles.length,
        ]
    )

    const applyAssistantSubmitStart = (input: {
        selectedConversationId: string | null
        optimisticConversation: AssistantConversation | null
        projectionConversation: AssistantConversation | null
        promptProjectionPart: AssistantConversationProjectionPart
        createdAt: string
    }) => {
        setDraft("")
        setSelectedAttachments([])

        if (input.selectedConversationId) {
            setLocallyManagedConversationId(input.selectedConversationId)
            assistantStore.startAssistantRun({
                conversationId: input.selectedConversationId,
            })
        } else if (input.optimisticConversation) {
            const optimisticConversation = input.optimisticConversation

            pendingOptimisticConversationIdRef.current = optimisticConversation.id
            setLocallyManagedConversationId(optimisticConversation.id)
            replaceAssistantThreadParam(optimisticConversation.id)
            assistantStore.upsertConversation(optimisticConversation)
            assistantStore.startAssistantRun({
                conversationId: optimisticConversation.id,
            })
        }

        if (!input.projectionConversation) return

        const projectionConversation = input.projectionConversation

        assistantStore.updateConversationProjections((projections) =>
            upsertAssistantConversationProjectionPart({
                projections,
                conversation: projectionConversation,
                part: input.promptProjectionPart,
                status: "streaming",
                updatedAt: input.createdAt,
            })
        )
    }

    const applyAssistantSubmitSuccess = (input: {
        optimisticConversation: AssistantConversation | null
        conversationId: string
        createdAt: string
    }) => {
        if (!input.optimisticConversation) return

        const optimisticConversation = input.optimisticConversation

        pendingNewConversationIdRef.current = null
        pendingOptimisticConversationIdRef.current = null
        assistantStore.replaceOptimisticConversationId({
            optimisticConversationId: optimisticConversation.id,
            conversationId: input.conversationId,
            userId: userId ?? "pending-user",
            organizationId,
            createdAt: input.createdAt,
        })
        replaceAssistantThreadParam(input.conversationId)
    }

    const applyAssistantSubmitFailure = (input: {
        optimisticConversation: AssistantConversation | null
        selectedConversationId: string | null
        userMessageId: string
        message: string
        attachments: AssistantAttachment[]
        isNewConversation: boolean
    }) => {
        if (input.optimisticConversation) {
            const optimisticConversation = input.optimisticConversation

            pendingNewConversationIdRef.current = optimisticConversation.id
            pendingOptimisticConversationIdRef.current = null
            assistantStore.updateConversations((conversations) =>
                removeAssistantConversation(conversations, optimisticConversation.id)
            )
            replaceAssistantThreadParam(QUEST_ASSISTANT_NEW_THREAD_VALUE)
            assistantStore.updateConversationProjections((projections) =>
                removeAssistantConversationProjectionFromState(
                    projections,
                    optimisticConversation.id
                )
            )
        } else if (input.selectedConversationId) {
            const selectedConversationId = input.selectedConversationId

            assistantStore.updateConversationProjections((projections) =>
                removeAssistantConversationProjectionPartsFromState({
                    projections,
                    conversationId: selectedConversationId,
                    partIds: [input.userMessageId],
                })
            )
        }

        setDraft(input.message)
        setSelectedAttachments(input.attachments)
        setLocallyManagedConversationId(
            input.isNewConversation ? null : input.selectedConversationId
        )
        assistantStore.clearAssistantRun()
    }

    const submitMessage = async () => {
        const message = draft.trim()
        if (
            !canSubmitAssistantMessage({
                message,
                selectedAttachmentCount: selectedAttachments.length,
                isStreaming,
                uploadingFileCount: uploadingFiles.length,
            })
        )
            return

        const isNewConversation = !selectedConversationId
        const userMessageId = generateUUID()
        const assistantMessageId = generateUUID()
        const optimisticConversationId = isNewConversation
            ? (pendingNewConversationIdRef.current ?? generateUUID())
            : null
        const createdAt = new Date().toISOString()
        const attachmentsForMessage = selectedAttachments
        const optimisticConversation = optimisticConversationId
            ? createOptimisticAssistantConversation({
                  id: optimisticConversationId,
                  userId,
                  organizationId,
                  createdAt,
              })
            : null
        const projectionConversation = getAssistantPromptProjectionConversation({
            selectedConversation,
            optimisticConversation,
            selectedConversationId,
            userId,
            organizationId,
            selectedTitle,
            createdAt,
        })
        const promptProjectionPart = createAssistantPromptProjectionPart({
            userId: userId ?? "pending-user",
            messageId: userMessageId,
            content: message,
            attachments: attachmentsForMessage,
            createdAt,
            runId: null,
        })

        applyAssistantSubmitStart({
            selectedConversationId,
            optimisticConversation,
            projectionConversation,
            promptProjectionPart,
            createdAt,
        })
        const promptProjectionPromise = recordAssistantPromptProjection({
            userId,
            conversation: projectionConversation,
            messageId: userMessageId,
            content: message,
            attachments: attachmentsForMessage,
            createdAt,
            failureMessage: "Failed to persist assistant prompt projection",
        })

        try {
            const commandConversationId = selectedConversationId ?? optimisticConversation?.id
            const result = await sendAssistantMessage({
                conversationId: commandConversationId,
                userMessageId,
                assistantMessageId,
                message,
                attachmentIds: attachmentsForMessage.map((attachment) => attachment.id),
                context: buildAssistantRuntimeContext(organizationId),
            })

            applyAssistantSubmitSuccess({
                optimisticConversation,
                conversationId: result.conversationId,
                createdAt,
            })
            await reconcileAssistantPromptProjectionConversation({
                promptProjectionPromise,
                userId,
                optimisticConversation,
                finalConversationId: result.conversationId,
                organizationId,
                messageId: userMessageId,
                content: message,
                attachments: attachmentsForMessage,
                createdAt,
                runId: result.runId,
            })
            setSelectedConversationId(result.conversationId)
            setLocallyManagedConversationId(result.conversationId)
            assistantStore.acceptAssistantRun({
                conversationId: result.conversationId,
                optimisticConversationId: optimisticConversation?.id,
                runId: result.runId,
            })
            recoverAssistantSyncSafely({ latestSyncId: result.lastSyncId })
        } catch (error) {
            await rollbackAssistantPromptProjection({
                promptProjectionPromise,
                userId,
                optimisticConversation,
                selectedConversationId,
                userMessageId,
            })
            showErrorToast(getErrorMessage(error))
            applyAssistantSubmitFailure({
                optimisticConversation,
                selectedConversationId,
                userMessageId,
                message,
                attachments: attachmentsForMessage,
                isNewConversation,
            })
        }
    }

    const stopAssistantRun = async () => {
        if (!activeRun?.runId || isCancellingRun) return

        assistantStore.startAssistantRunCancellation()

        try {
            await cancelAssistantRun(activeRun.runId)
        } catch (error) {
            assistantStore.finishAssistantRunCancellation()
            showErrorToast(getErrorMessage(error))
        }
    }

    const confirmAction = async (action: AssistantAction) => {
        if (pendingActionId) return

        setPendingActionId(action.id)

        try {
            const confirmedAction = await confirmAssistantAction(action.id)
            const conversationId = confirmedAction.conversationId ?? action.conversationId

            if (conversationId) {
                applyAssistantActionUpdate(confirmedAction, conversationId)
            }

            const routePath = getActionRoutePath(confirmedAction)
            if (routePath) {
                void navigate({ href: routePath })
            }
        } catch (error) {
            showErrorToast(getErrorMessage(error))
        } finally {
            setPendingActionId(null)
        }
    }

    const cancelAction = async (action: AssistantAction) => {
        if (pendingActionId) return

        setPendingActionId(action.id)

        try {
            const cancelledAction = await cancelAssistantAction(action.id)
            const conversationId = cancelledAction.conversationId ?? action.conversationId

            if (conversationId) {
                applyAssistantActionUpdate(cancelledAction, conversationId)
            }
        } catch (error) {
            showErrorToast(getErrorMessage(error))
        } finally {
            setPendingActionId(null)
        }
    }

    const handleAssistantOpenChange = useCallback(
        (nextOpen: boolean) => {
            setOpen(nextOpen)

            if (nextOpen) {
                replaceAssistantThreadParam(
                    selectedConversationId ??
                        locallyManagedConversationId ??
                        QUEST_ASSISTANT_NEW_THREAD_VALUE
                )
                return
            }

            if (!nextOpen) {
                setAttachmentMenuOpen(false)
                setAttachmentLibraryOpen(false)
                setAttachmentLibrarySearch("")

                const nextHref = removeAssistantConversationParamFromLocation(assistantLocation)
                if (nextHref) {
                    void navigate({ href: nextHref, replace: true })
                }
            }
        },
        [
            assistantLocation,
            locallyManagedConversationId,
            navigate,
            replaceAssistantThreadParam,
            selectedConversationId,
        ]
    )

    const handleAttachmentMenuOpenChange = useCallback(
        (nextOpen: boolean) => {
            setAttachmentMenuOpen(nextOpen)

            if (nextOpen) {
                void assistantStore.loadRecentAttachments()
            }
        },
        [assistantStore]
    )

    const handleAttachmentLibraryOpenChange = useCallback((nextOpen: boolean) => {
        setAttachmentLibraryOpen(nextOpen)

        if (!nextOpen) {
            setAttachmentLibrarySearch("")
        }
    }, [])

    const openAttachmentLibrary = useCallback(() => {
        setAttachmentMenuOpen(false)
        setAttachmentLibraryOpen(true)
    }, [])

    useEffect(() => {
        if (!attachmentLibraryOpen) return

        void assistantStore.loadAttachmentLibrary({
            search: deferredAttachmentLibrarySearch,
            reset: true,
        })
    }, [assistantStore, attachmentLibraryOpen, deferredAttachmentLibrarySearch])

    return (
        <>
            <Dialog open={open} onOpenChange={handleAssistantOpenChange}>
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        radius="full"
                        className="h-8 px-2.5"
                        aria-label="Open Quest Assistant"
                    >
                        <Sparkles className="size-4" />
                        <span className="hidden sm:inline">Ask Quest</span>
                    </Button>
                </DialogTrigger>
                <DialogContent
                    className="max-h-[min(720px,88vh)] max-w-3xl overflow-hidden border border-ds-surface-border"
                    overlayClassName="bg-transparent"
                    onInteractOutside={(event) => {
                        if (attachmentLibraryOpen) {
                            event.preventDefault()
                        }
                    }}
                >
                    <DialogHeader className="border-ds-surface-border border-b px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <DialogTitle className="truncate text-lg">
                                    {selectedTitle}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    Quest Assistant chat
                                </DialogDescription>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {selectedConversationId && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={toggleSelectedConversationFavorite}
                                                disabled={
                                                    !canToggleSelectedConversationFavorite ||
                                                    favoriteToggleMutation.isPending
                                                }
                                                aria-label={favoriteSelectedConversationLabel}
                                                className={
                                                    isSelectedAssistantConversationFavorited
                                                        ? "text-ds-fg hover:text-ds-fg"
                                                        : "text-ds-fg-muted hover:text-ds-fg"
                                                }
                                            >
                                                <Star
                                                    className="size-4"
                                                    fill={
                                                        isSelectedAssistantConversationFavorited
                                                            ? "currentColor"
                                                            : "none"
                                                    }
                                                />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {favoriteSelectedConversationLabel}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                {selectedConversationId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteConversation(selectedConversationId)}
                                        disabled={deletingConversationId === selectedConversationId}
                                        aria-label="Delete current chat"
                                    >
                                        <Trash2 className="size-4 text-ds-danger-fg" />
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={startNewChat}
                                    disabled={isStreaming}
                                >
                                    <Plus className="size-4" />
                                    New
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="hidden min-h-0 border-ds-surface-border border-r bg-ds-canvas md:flex md:flex-col">
                            <div className="flex h-11 items-center gap-2 border-ds-surface-border border-b px-4 font-medium text-ds-fg-muted text-sm">
                                <History className="size-4" />
                                History
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                                {assistantStore.isConversationHistoryInitialLoading ? (
                                    <p className="px-2 py-3 text-ds-fg-muted text-sm">Loading...</p>
                                ) : conversations.length === 0 ? (
                                    <p className="px-2 py-3 text-ds-fg-muted text-sm">
                                        No conversations yet.
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {conversations.map((conversation) => {
                                            const title =
                                                assistantStore.streamedConversationTitles[
                                                    conversation.id
                                                ] ?? conversation.title
                                            const isActive =
                                                conversation.id === selectedConversationId ||
                                                conversation.id === locallyManagedConversationId
                                            const isDeleting =
                                                deletingConversationId === conversation.id
                                            const isPendingOptimisticConversation =
                                                pendingOptimisticConversationIdRef.current ===
                                                conversation.id

                                            return (
                                                <div
                                                    key={conversation.id}
                                                    className="group flex items-center gap-1 rounded-sm px-1 hover:bg-ds-surface-interactive data-[active=true]:bg-ds-surface-interactive"
                                                    data-active={isActive}
                                                >
                                                    <button
                                                        type="button"
                                                        className="min-w-0 flex-1 truncate px-1 py-2 text-left text-ds-fg text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                                        disabled={isStreaming}
                                                        onClick={() =>
                                                            selectConversation(conversation)
                                                        }
                                                    >
                                                        {title}
                                                    </button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 opacity-70 hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                        disabled={
                                                            isDeleting ||
                                                            isPendingOptimisticConversation
                                                        }
                                                        onClick={() =>
                                                            deleteConversation(conversation.id)
                                                        }
                                                        aria-label={`Delete ${title}`}
                                                    >
                                                        <Trash2 className="size-3.5 text-ds-danger-fg" />
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </aside>

                        <section className="flex min-h-[520px] min-w-0 flex-col bg-ds-surface">
                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                                <AssistantConversationPanel
                                    activeConversationId={activeConversationId}
                                    conversationProjection={selectedConversationProjection}
                                    isConversationLoadError={assistantStore.isConversationLoadError}
                                    isStreaming={isStreaming}
                                    pendingActionId={pendingActionId}
                                    proposedActions={proposedActions}
                                    onCancelAction={cancelAction}
                                    onConfirmAction={confirmAction}
                                />
                            </div>

                            <div className="border-ds-surface-border border-t p-3">
                                <div className="space-y-2">
                                    <input
                                        ref={attachmentInputRef}
                                        type="file"
                                        multiple
                                        accept={CONVERSATION_ATTACHMENT_FILE_CONFIG.accept}
                                        className="hidden"
                                        onChange={(event) => {
                                            void handleAttachmentFilesSelected(
                                                event.currentTarget.files
                                            )
                                        }}
                                    />
                                    <AssistantComposerAttachments
                                        attachments={selectedAttachments}
                                        uploadingFiles={uploadingFiles}
                                        onRemoveAttachment={removeSelectedAttachment}
                                    />
                                    <div className="flex items-end gap-2">
                                        <AssistantAttachmentMenu
                                            open={attachmentMenuOpen}
                                            disabled={isStreaming}
                                            recentAttachments={recentAttachments}
                                            selectedAttachmentIds={selectedAttachmentIds}
                                            isLoadingRecentAttachments={
                                                assistantStore.isRecentAttachmentsLoading
                                            }
                                            onOpenChange={handleAttachmentMenuOpenChange}
                                            onChooseFiles={chooseAttachmentFiles}
                                            onOpenLibrary={openAttachmentLibrary}
                                            onSelectAttachment={addSelectedAttachment}
                                        />
                                        <Textarea
                                            value={draft}
                                            onChange={(event) =>
                                                setDraft(event.currentTarget.value)
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" && !event.shiftKey) {
                                                    event.preventDefault()
                                                    void submitMessage()
                                                }
                                            }}
                                            disabled={isStreaming}
                                            placeholder="Ask Quest..."
                                            rows={2}
                                            className="max-h-36 min-h-16 resize-none bg-ds-surface"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            radius="full"
                                            disabled={
                                                isStreaming
                                                    ? !activeRun?.runId || isCancellingRun
                                                    : (!draft.trim() &&
                                                          selectedAttachments.length === 0) ||
                                                      uploadingFiles.length > 0
                                            }
                                            onClick={() => {
                                                if (isStreaming) {
                                                    void stopAssistantRun()
                                                    return
                                                }
                                                void submitMessage()
                                            }}
                                            aria-label={
                                                isStreaming ? "Stop generating" : "Send message"
                                            }
                                        >
                                            {isStreaming ? (
                                                <Square className="size-4 fill-current" />
                                            ) : (
                                                <Send className="size-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </DialogContent>
            </Dialog>
            <AssistantAttachmentLibraryDialog
                open={attachmentLibraryOpen}
                search={attachmentLibrarySearch}
                attachments={libraryAttachments}
                selectedAttachmentIds={selectedAttachmentIds}
                isLoading={assistantStore.isAttachmentLibraryLoading}
                isFetchingNextPage={assistantStore.isAttachmentLibraryFetchingNextPage}
                hasNextPage={assistantStore.attachmentLibraryHasMore}
                onOpenChange={handleAttachmentLibraryOpenChange}
                onSearchChange={setAttachmentLibrarySearch}
                onLoadMore={() => {
                    void assistantStore.loadAttachmentLibrary({
                        search: deferredAttachmentLibrarySearch,
                        reset: false,
                    })
                }}
                onSelectAttachment={addSelectedAttachment}
            />
        </>
    )
})
