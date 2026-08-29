import { Bot, ChevronRight, LoaderCircle, X } from "lucide-react"
import { formatFileSize } from "@/shared/lib/file-size"
import { Button } from "@/shared/ui/button"
import { getAssistantProjectionPartAttachments } from "../lib/quest-assistant-attachments"
import type {
    AssistantAction,
    AssistantAttachment,
    AssistantConversationProjection,
    AssistantConversationProjectionPart,
} from "../model/quest-assistant"
import { getAssistantProjectionPartText } from "../model/quest-assistant-realtime-log.client"
import {
    type AssistantConversationTimelineItem,
    getAssistantConversationTimelineItems,
} from "../model/quest-assistant-timeline"
import { AssistantAttachmentThumb } from "./assistant-attachments"

const EMPTY_ASSISTANT_RESPONSE_MESSAGE = "I couldn't complete that response. Please try again."

export function AssistantConversationPanel({
    activeConversationId,
    conversationProjection,
    isConversationLoadError,
    isStreaming,
    pendingActionId,
    proposedActions,
    onCancelAction,
    onConfirmAction,
}: {
    activeConversationId: string | null
    conversationProjection: AssistantConversationProjection | null
    isConversationLoadError: boolean
    isStreaming: boolean
    pendingActionId: string | null
    proposedActions: AssistantAction[]
    onCancelAction: (action: AssistantAction) => void | Promise<void>
    onConfirmAction: (action: AssistantAction) => void | Promise<void>
}) {
    const timelineItems = getAssistantConversationTimelineItems({
        parts: conversationProjection?.parts ?? [],
        isStreaming,
    })

    if (!conversationProjection && activeConversationId) {
        return isConversationLoadError ? (
            <AssistantConversationLoadError />
        ) : (
            <AssistantConversationLoadingState />
        )
    }

    if (timelineItems.length === 0 && !isStreaming && proposedActions.length === 0) {
        return <AssistantNewThreadEmptyState />
    }

    return (
        <div className="space-y-4">
            {timelineItems.map((item) => {
                if (item.type === "part") {
                    return <AssistantMessageBubble key={item.part.id} part={item.part} />
                }

                if (item.type === "reasoning") {
                    return <AssistantReasoningGroup key={item.id} item={item} />
                }

                return <AssistantThinkingIndicator key={item.id} label={item.label} />
            })}
            {proposedActions.length > 0 && (
                <div className="space-y-2">
                    {proposedActions.map((action) => (
                        <AssistantActionCard
                            key={action.id}
                            action={action}
                            isPending={pendingActionId === action.id}
                            onConfirm={onConfirmAction}
                            onCancel={onCancelAction}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function AssistantNewThreadEmptyState() {
    return (
        <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="mb-3 size-8 text-ds-fg-muted" />
            <p className="font-medium text-ds-fg">How can I help?</p>
            <p className="mt-1 max-w-sm text-ds-fg-muted text-sm">
                Ask a question about Quest or your current workspace.
            </p>
        </div>
    )
}

function AssistantConversationLoadingState() {
    return (
        <output
            className="flex h-full items-center justify-center text-ds-fg-muted"
            aria-busy="true"
            aria-label="Loading chat"
        >
            <LoaderCircle className="size-5 animate-spin" />
        </output>
    )
}

function AssistantConversationLoadError() {
    return (
        <div className="flex h-full flex-col items-center justify-center text-center">
            <X className="mb-3 size-7 text-ds-fg-muted" />
            <p className="font-medium text-ds-fg">Unable to load chat</p>
            <p className="mt-1 max-w-sm text-ds-fg-muted text-sm">
                Select another chat or try again.
            </p>
        </div>
    )
}

function AssistantThinkingIndicator({ label }: { label: string }) {
    return (
        <div className="flex justify-start">
            <div className="flex max-w-[82%] items-center gap-2 text-ds-fg-muted text-sm">
                <LoaderCircle className="size-3.5 animate-spin" />
                <span>{label}</span>
            </div>
        </div>
    )
}

function AssistantReasoningGroup({
    item,
}: {
    item: Extract<AssistantConversationTimelineItem, { type: "reasoning" }>
}) {
    if (item.isStreaming) {
        const label = getAssistantReasoningGroupStatusLabel(item)

        return (
            <div className="flex justify-start">
                <div className="flex max-w-[82%] items-center gap-2 text-ds-fg-muted text-sm">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    <span>{label}</span>
                </div>
            </div>
        )
    }

    const detailParts = item.parts
        .map((part) => ({
            id: part.id,
            label: getAssistantReasoningPartLabel(part),
            text: getAssistantReasoningPartText(part),
        }))
        .filter((part) => part.text.length > 0 || part.label.length > 0)

    return (
        <details className="group max-w-[82%] text-ds-fg-muted text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-1 font-medium marker:hidden">
                <span>{getAssistantReasoningDurationLabel(item.parts)}</span>
                <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
            </summary>
            {detailParts.length > 0 && (
                <div className="mt-2 space-y-2 pl-4">
                    {detailParts.map((part) => (
                        <div key={part.id} className="border-ds-surface-border border-l pl-3">
                            <p className="font-medium">{part.label}</p>
                            {part.text.length > 0 && (
                                <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </details>
    )
}

function getAssistantReasoningGroupStatusLabel(
    item: Extract<AssistantConversationTimelineItem, { type: "reasoning" }>
): string {
    const lastPart = item.parts.at(-1)
    if (!lastPart) return ""

    return getAssistantReasoningPartLabel(lastPart)
}

function getAssistantReasoningPartLabel(part: AssistantConversationProjectionPart): string {
    const text = getAssistantReasoningPartText(part)

    return (
        getAssistantProjectionPartMetadataString(part, "label") ??
        getAssistantProjectionPartMetadataString(part, "title") ??
        part.title ??
        (text.length > 0 ? text : "")
    )
}

function getAssistantReasoningPartText(part: AssistantConversationProjectionPart): string {
    return getAssistantProjectionPartText(part).trim()
}

function getAssistantReasoningDurationLabel(parts: AssistantConversationProjectionPart[]): string {
    const startedAt = getAssistantReasoningStartedAt(parts)
    const endedAt = getAssistantReasoningEndedAt(parts)

    if (!startedAt || !endedAt) return "Worked"

    const durationSeconds = Math.max(
        1,
        Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
    )
    const unit = durationSeconds === 1 ? "second" : "seconds"

    return `Worked for ${durationSeconds} ${unit}`
}

function getAssistantReasoningStartedAt(parts: AssistantConversationProjectionPart[]): Date | null {
    return getAssistantReasoningBoundaryDate(parts, "startedAt", "min")
}

function getAssistantReasoningEndedAt(parts: AssistantConversationProjectionPart[]): Date | null {
    return getAssistantReasoningBoundaryDate(parts, "endedAt", "max")
}

function getAssistantReasoningBoundaryDate(
    parts: AssistantConversationProjectionPart[],
    metadataKey: "startedAt" | "endedAt",
    mode: "min" | "max"
): Date | null {
    const timestamps = parts
        .map(
            (part) =>
                getAssistantProjectionPartMetadataString(part, metadataKey) ??
                (metadataKey === "startedAt" ? part.createdAt : part.updatedAt)
        )
        .map((value) => Date.parse(value))
        .filter(Number.isFinite)

    if (timestamps.length === 0) return null

    const timestamp = mode === "min" ? Math.min(...timestamps) : Math.max(...timestamps)

    return new Date(timestamp)
}

function getAssistantProjectionPartMetadataString(
    part: AssistantConversationProjectionPart,
    key: string
): string | null {
    const value = part.metadata?.[key]
    if (typeof value !== "string") return null

    const trimmedValue = value.trim()
    return trimmedValue.length > 0 ? trimmedValue : null
}

function AssistantMessageBubble({ part }: { part: AssistantConversationProjectionPart }) {
    const isUser = part.type === "prompt" || part.role === "user"
    const attachments = getAssistantProjectionPartAttachments(part)
    const content = getAssistantProjectionPartText(part)
    const hasAttachments = attachments.length > 0
    const isStreaming = !isUser && part.status === "streaming"

    return (
        <div className={isUser ? "flex justify-end" : "flex justify-start"}>
            <div
                className={
                    isUser
                        ? "max-w-[82%] rounded-md bg-ds-accent px-3 py-2 text-ds-on-accent text-sm"
                        : "max-w-[82%] rounded-md bg-ds-canvas px-3 py-2 text-ds-fg text-sm"
                }
            >
                {hasAttachments && (
                    <AssistantMessageAttachments attachments={attachments} isUser={isUser} />
                )}
                {content ? (
                    <p
                        className={
                            hasAttachments ? "mt-2 whitespace-pre-wrap" : "whitespace-pre-wrap"
                        }
                    >
                        {content}
                    </p>
                ) : isStreaming ? (
                    <p className="text-ds-fg-muted">Thinking...</p>
                ) : isUser && hasAttachments ? null : (
                    <p className="text-ds-fg-muted">{EMPTY_ASSISTANT_RESPONSE_MESSAGE}</p>
                )}
            </div>
        </div>
    )
}

function AssistantMessageAttachments({
    attachments,
    isUser,
}: {
    attachments: AssistantAttachment[]
    isUser: boolean
}) {
    return (
        <div className="space-y-1.5">
            {attachments.map((attachment) => (
                <a
                    key={attachment.id}
                    href={attachment.downloadUrl ?? attachment.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={
                        isUser
                            ? "flex max-w-full items-center gap-2 rounded-sm border border-white/20 bg-white/15 px-2 py-1.5 text-ds-on-accent"
                            : "flex max-w-full items-center gap-2 rounded-sm border border-ds-surface-border bg-ds-surface px-2 py-1.5 text-ds-fg"
                    }
                >
                    <AssistantAttachmentThumb attachment={attachment} />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{attachment.originalName}</span>
                        <span
                            className={
                                isUser
                                    ? "block text-xs opacity-80"
                                    : "block text-ds-fg-muted text-xs"
                            }
                        >
                            {formatFileSize(attachment.size)}
                        </span>
                    </span>
                </a>
            ))}
        </div>
    )
}

function AssistantActionCard({
    action,
    isPending,
    onConfirm,
    onCancel,
}: {
    action: AssistantAction
    isPending: boolean
    onConfirm: (action: AssistantAction) => void
    onCancel: (action: AssistantAction) => void
}) {
    return (
        <div className="ml-0 max-w-[82%] rounded-md border border-ds-surface-border bg-ds-canvas px-3 py-2 text-sm">
            <p className="font-medium text-ds-fg">{action.title}</p>
            <p className="mt-1 text-ds-fg-muted">{action.summary}</p>
            <div className="mt-3 flex items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    onClick={() => onConfirm(action)}
                    disabled={isPending}
                >
                    {action.buttonLabel}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(action)}
                    disabled={isPending}
                >
                    Dismiss
                </Button>
            </div>
        </div>
    )
}
