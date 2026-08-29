import type { AssistantConversationProjectionPart } from "./quest-assistant"

export type AssistantConversationTimelineItem =
    | {
          type: "part"
          part: AssistantConversationProjectionPart
      }
    | {
          type: "reasoning"
          id: string
          parts: AssistantConversationProjectionPart[]
          isStreaming: boolean
      }
    | {
          type: "thinking"
          id: string
          label: string
      }

export function getAssistantConversationTimelineItems(input: {
    parts: AssistantConversationProjectionPart[]
    isStreaming: boolean
}): AssistantConversationTimelineItem[] {
    const sortedParts = [...input.parts].sort(compareAssistantProjectionPartsForDisplay)
    const items: AssistantConversationTimelineItem[] = []
    let currentReasoningParts: AssistantConversationProjectionPart[] = []

    for (const part of sortedParts) {
        if (part.type === "reasoning") {
            currentReasoningParts.push(part)
            continue
        }

        if (currentReasoningParts.length > 0) {
            items.push(
                createAssistantReasoningTimelineItem(currentReasoningParts, input.isStreaming)
            )
            currentReasoningParts = []
        }

        if (isAssistantProjectionPartVisibleInTimeline(part)) {
            items.push({ type: "part", part })
        }
    }

    if (currentReasoningParts.length > 0) {
        items.push(createAssistantReasoningTimelineItem(currentReasoningParts, input.isStreaming))
    }

    if (shouldAppendAssistantThinkingTimelineItem({ items, isStreaming: input.isStreaming })) {
        items.push({
            type: "thinking",
            id: "assistant-thinking",
            label: "Thinking",
        })
    }

    return markAssistantActiveReasoningTimelineItem({
        items,
        isStreaming: input.isStreaming,
    })
}

function createAssistantReasoningTimelineItem(
    parts: AssistantConversationProjectionPart[],
    isStreaming: boolean
): AssistantConversationTimelineItem {
    const sortedParts = [...parts].sort(compareAssistantProjectionPartsForDisplay)
    const lastPart = sortedParts.at(-1)

    return {
        type: "reasoning",
        id: `reasoning:${sortedParts[0]?.id ?? "pending"}:${lastPart?.id ?? "pending"}`,
        parts: sortedParts,
        isStreaming: isStreaming && sortedParts.some((part) => part.status === "streaming"),
    }
}

function markAssistantActiveReasoningTimelineItem(input: {
    items: AssistantConversationTimelineItem[]
    isStreaming: boolean
}): AssistantConversationTimelineItem[] {
    if (!input.isStreaming) return input.items

    const activeReasoningIndex = getLastAssistantReasoningTimelineIndex(input.items)
    if (activeReasoningIndex === -1) return input.items

    const hasAssistantTextAfterActiveReasoning = input.items
        .slice(activeReasoningIndex + 1)
        .some(
            (item) =>
                item.type === "part" && item.part.type === "text" && item.part.role === "assistant"
        )

    if (hasAssistantTextAfterActiveReasoning) return input.items

    return input.items.map((item, index) =>
        item.type === "reasoning"
            ? {
                  ...item,
                  isStreaming: index === activeReasoningIndex,
              }
            : item
    )
}

function getLastAssistantReasoningTimelineIndex(
    items: AssistantConversationTimelineItem[]
): number {
    for (let index = items.length - 1; index >= 0; index -= 1) {
        if (items[index]?.type === "reasoning") return index
    }

    return -1
}

function isAssistantProjectionPartVisibleInTimeline(
    part: AssistantConversationProjectionPart
): boolean {
    return part.type === "prompt" || (part.type === "text" && part.role === "assistant")
}

function shouldAppendAssistantThinkingTimelineItem(input: {
    items: AssistantConversationTimelineItem[]
    isStreaming: boolean
}): boolean {
    if (!input.isStreaming) return false

    const lastPromptIndex = getLastAssistantPromptTimelineIndex(input.items)
    if (lastPromptIndex === -1) return input.items.length === 0

    const itemsAfterLastPrompt = input.items.slice(lastPromptIndex + 1)

    return !itemsAfterLastPrompt.some((item) => {
        if (item.type === "reasoning" || item.type === "thinking") return true

        return item.part.type === "text" && item.part.role === "assistant"
    })
}

function getLastAssistantPromptTimelineIndex(items: AssistantConversationTimelineItem[]): number {
    for (let index = items.length - 1; index >= 0; index -= 1) {
        const item = items[index]
        if (item?.type === "part" && item.part.type === "prompt") return index
    }

    return -1
}

function compareAssistantProjectionPartsForDisplay(
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
