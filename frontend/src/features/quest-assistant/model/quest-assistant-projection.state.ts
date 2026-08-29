import type {
    AssistantConversation,
    AssistantConversationProjection,
    AssistantConversationProjectionPart,
} from "./quest-assistant"
import { createAssistantConversationSnapshot } from "./quest-assistant-conversation.state"
import {
    createAssistantConversationProjection,
    getAssistantProjectionPartText,
    mergeAssistantProjectionParts,
    updateAssistantProjectionPartBody,
} from "./quest-assistant-realtime-log.client"

export function upsertAssistantConversationProjectionPart(input: {
    projections: AssistantConversationProjection[]
    conversation: AssistantConversation
    part: AssistantConversationProjectionPart
    status: AssistantConversationProjection["status"]
    updatedAt: string
}): AssistantConversationProjection[] {
    const existingProjection = input.projections.find(
        (projection) => projection.id === input.conversation.id
    )
    const nextProjection = existingProjection
        ? {
              ...existingProjection,
              status: input.status,
              parts: mergeAssistantProjectionParts(existingProjection.parts, [input.part]),
              updatedAt: input.updatedAt,
          }
        : createAssistantConversationProjection({
              userId: input.conversation.userId,
              conversation: input.conversation,
              parts: [input.part],
              status: input.status,
              readAt: null,
              updatedAt: input.updatedAt,
          })

    return upsertAssistantConversationProjection(input.projections, nextProjection)
}

export function appendAssistantConversationProjectionPartDelta(input: {
    projections: AssistantConversationProjection[]
    conversation: AssistantConversation
    partId: string
    delta: string
    content?: string
}): AssistantConversationProjection[] {
    const updatedAt = new Date().toISOString()
    const existingProjection = input.projections.find(
        (projection) => projection.id === input.conversation.id
    )
    const existingPart = existingProjection?.parts.find((part) => part.id === input.partId)
    const existingContent = existingPart ? getAssistantProjectionPartText(existingPart) : ""
    const content = input.content
        ? existingContent.length > input.content.length
            ? existingContent
            : input.content
        : `${existingContent}${input.delta}`
    const nextPart = existingPart
        ? updateAssistantProjectionPartBody({
              part: existingPart,
              content,
              status: "streaming",
              updatedAt,
          })
        : updateAssistantProjectionPartBody({
              part: createAssistantStreamingTextProjectionPart({
                  id: input.partId,
                  createdAt: updatedAt,
              }),
              content,
              status: "streaming",
              updatedAt,
          })

    return upsertAssistantConversationProjectionPart({
        projections: input.projections,
        conversation: input.conversation,
        part: nextPart,
        status: "streaming",
        updatedAt,
    })
}

export function completeAssistantConversationProjectionPart(input: {
    projections: AssistantConversationProjection[]
    conversationId: string
    partId: string
    content: string | undefined
    updatedAt: string
}): AssistantConversationProjection[] {
    return input.projections.map((projection) => {
        if (projection.id !== input.conversationId) return projection

        const existingPart = projection.parts.find((part) => part.id === input.partId)
        if (!existingPart && !input.content) return projection

        const nextPart = updateAssistantProjectionPartBody({
            part:
                existingPart ??
                createAssistantStreamingTextProjectionPart({
                    id: input.partId,
                    createdAt: input.updatedAt,
                }),
            content:
                input.content ?? (existingPart ? getAssistantProjectionPartText(existingPart) : ""),
            status: "completed",
            updatedAt: input.updatedAt,
        })

        return {
            ...projection,
            parts: mergeAssistantProjectionParts(projection.parts, [nextPart]),
            updatedAt: input.updatedAt,
        }
    })
}

export function finishAssistantConversationProjectionRun(
    projections: AssistantConversationProjection[],
    conversationId: string
): AssistantConversationProjection[] {
    const updatedAt = new Date().toISOString()

    return projections.map((projection) => {
        if (projection.id !== conversationId) return projection

        return {
            ...projection,
            status: "complete",
            parts: projection.parts.flatMap((part) => {
                if (
                    part.type !== "text" ||
                    part.role !== "assistant" ||
                    part.status !== "streaming"
                ) {
                    return [part]
                }

                const content = getAssistantProjectionPartText(part)
                if (!content.trim()) return []

                return [
                    updateAssistantProjectionPartBody({
                        part,
                        content,
                        status: "completed",
                        updatedAt,
                    }),
                ]
            }),
            updatedAt,
        }
    })
}

export function failAssistantConversationProjectionRun(
    projections: AssistantConversationProjection[],
    conversationId: string
): AssistantConversationProjection[] {
    const updatedAt = new Date().toISOString()

    return projections.map((projection) => {
        if (projection.id !== conversationId) return projection

        return {
            ...projection,
            status: "failed",
            parts: projection.parts.filter(
                (part) =>
                    part.type !== "text" ||
                    part.role !== "assistant" ||
                    part.status !== "streaming" ||
                    getAssistantProjectionPartText(part).trim().length > 0
            ),
            updatedAt,
        }
    })
}

export function createAssistantStreamingTextProjectionPart(input: {
    id: string
    createdAt: string
}): AssistantConversationProjectionPart {
    return {
        id: input.id,
        type: "text",
        role: "assistant",
        runId: null,
        status: "streaming",
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
    }
}

export function mergeAssistantConversationProjections(
    projections: AssistantConversationProjection[],
    nextProjections: AssistantConversationProjection[]
): AssistantConversationProjection[] {
    return nextProjections.reduce(upsertAssistantConversationProjection, projections)
}

export function upsertAssistantConversationProjection(
    projections: AssistantConversationProjection[],
    nextProjection: AssistantConversationProjection
): AssistantConversationProjection[] {
    const existingProjection = projections.find((projection) => projection.id === nextProjection.id)
    const projectionToStore = existingProjection
        ? mergeAssistantConversationProjectionRecord(existingProjection, nextProjection)
        : nextProjection

    return [
        projectionToStore,
        ...projections.filter((projection) => projection.id !== projectionToStore.id),
    ].sort((firstProjection, secondProjection) => {
        return Date.parse(secondProjection.updatedAt) - Date.parse(firstProjection.updatedAt)
    })
}

function mergeAssistantConversationProjectionRecord(
    existingProjection: AssistantConversationProjection,
    nextProjection: AssistantConversationProjection
): AssistantConversationProjection {
    const baseProjection = isAssistantConversationProjectionNewer(
        existingProjection,
        nextProjection
    )
        ? existingProjection
        : nextProjection

    return {
        ...baseProjection,
        parts: mergeAssistantProjectionParts(existingProjection.parts, nextProjection.parts),
        pendingMessages: mergeAssistantProjectionParts(
            existingProjection.pendingMessages,
            nextProjection.pendingMessages
        ),
    }
}

export function updateAssistantConversationProjectionTitle(
    projections: AssistantConversationProjection[],
    conversationId: string,
    title: string
): AssistantConversationProjection[] {
    const updatedAt = new Date().toISOString()

    return projections.map((projection) =>
        projection.id === conversationId
            ? {
                  ...projection,
                  summary: title,
                  updatedAt,
              }
            : projection
    )
}

export function replaceOptimisticAssistantConversationProjection(
    projections: AssistantConversationProjection[],
    optimisticConversationId: string,
    conversation: AssistantConversation
): AssistantConversationProjection[] {
    const optimisticProjection = projections.find(
        (projection) => projection.id === optimisticConversationId
    )
    if (!optimisticProjection) return projections

    const nextProjection = createAssistantConversationProjection({
        userId: conversation.userId,
        conversation,
        parts: optimisticProjection.parts,
        status: optimisticProjection.status,
        readAt: optimisticProjection.readAt,
        updatedAt: conversation.updatedAt,
    })

    return upsertAssistantConversationProjection(
        removeAssistantConversationProjectionFromState(projections, optimisticConversationId),
        nextProjection
    )
}

export function replaceOptimisticAssistantConversationProjectionId(input: {
    projections: AssistantConversationProjection[]
    optimisticConversationId: string
    conversationId: string
    userId: string
    organizationId: string | undefined
    createdAt: string
}): AssistantConversationProjection[] {
    const optimisticProjection = input.projections.find(
        (projection) => projection.id === input.optimisticConversationId
    )
    if (!optimisticProjection) return input.projections

    const conversation = createAssistantConversationSnapshot({
        id: input.conversationId,
        userId: input.userId,
        organizationId: input.organizationId,
        title: optimisticProjection.summary,
        createdAt: input.createdAt,
    })
    const nextProjection = createAssistantConversationProjection({
        userId: input.userId,
        conversation,
        parts: optimisticProjection.parts,
        status: optimisticProjection.status,
        readAt: optimisticProjection.readAt,
        updatedAt: optimisticProjection.updatedAt,
    })

    return upsertAssistantConversationProjection(
        removeAssistantConversationProjectionFromState(
            input.projections,
            input.optimisticConversationId
        ),
        nextProjection
    )
}

export function removeAssistantConversationProjectionFromState(
    projections: AssistantConversationProjection[],
    conversationId: string
): AssistantConversationProjection[] {
    return projections.filter((projection) => projection.id !== conversationId)
}

export function removeAssistantConversationProjectionPartsFromState(input: {
    projections: AssistantConversationProjection[]
    conversationId: string
    partIds: string[]
}): AssistantConversationProjection[] {
    const partIds = new Set(input.partIds)

    return input.projections.map((projection) =>
        projection.id === input.conversationId
            ? {
                  ...projection,
                  parts: projection.parts.filter((part) => !partIds.has(part.id)),
                  updatedAt: new Date().toISOString(),
              }
            : projection
    )
}

function isAssistantConversationProjectionNewer(
    existingProjection: AssistantConversationProjection,
    nextProjection: AssistantConversationProjection
) {
    const existingUpdatedAt = Date.parse(existingProjection.updatedAt)
    const nextUpdatedAt = Date.parse(nextProjection.updatedAt)

    return Number.isFinite(existingUpdatedAt) && Number.isFinite(nextUpdatedAt)
        ? existingUpdatedAt > nextUpdatedAt
        : false
}
