import type {
    AssistantAttachment,
    AssistantConversationProjectionPart,
} from "../model/quest-assistant"

export function appendUniqueAssistantAttachments(
    currentAttachments: AssistantAttachment[],
    nextAttachments: AssistantAttachment[]
): AssistantAttachment[] {
    const seenAttachmentIds = new Set(currentAttachments.map((attachment) => attachment.id))
    const uniqueNextAttachments = nextAttachments.filter((attachment) => {
        if (seenAttachmentIds.has(attachment.id)) return false

        seenAttachmentIds.add(attachment.id)
        return true
    })

    return [...currentAttachments, ...uniqueNextAttachments]
}

export function getAssistantProjectionPartAttachments(
    part: AssistantConversationProjectionPart
): AssistantAttachment[] {
    return getAssistantBodyDataAttachmentNodes(part.bodyData).map((node) =>
        createAssistantAttachmentFromBodyNode({
            node,
            createdAt: part.createdAt,
            updatedAt: part.updatedAt,
        })
    )
}

function getAssistantBodyDataAttachmentNodes(
    bodyData: AssistantConversationProjectionPart["bodyData"]
): Record<string, unknown>[] {
    if (!bodyData) return []

    return bodyData.content.flatMap(getAssistantBodyNodeAttachmentNodes)
}

function getAssistantBodyNodeAttachmentNodes(
    node: Record<string, unknown>
): Record<string, unknown>[] {
    if (node.type === "image" || node.type === "file") return [node]
    if (!Array.isArray(node.content)) return []

    return node.content
        .filter(
            (child): child is Record<string, unknown> => Boolean(child) && typeof child === "object"
        )
        .flatMap(getAssistantBodyNodeAttachmentNodes)
}

function createAssistantAttachmentFromBodyNode(input: {
    node: Record<string, unknown>
    createdAt: string
    updatedAt: string
}): AssistantAttachment {
    const attrs = typeof input.node.attrs === "object" && input.node.attrs ? input.node.attrs : {}
    const attrRecord = attrs as Record<string, unknown>
    const originalName =
        getAssistantBodyStringAttr(attrRecord, "title") ??
        getAssistantBodyStringAttr(attrRecord, "name") ??
        "Attached file"
    const id =
        getAssistantBodyStringAttr(attrRecord, "attachmentId") ??
        getAssistantBodyStringAttr(attrRecord, "uploadId") ??
        originalName
    const mimeType =
        getAssistantBodyStringAttr(attrRecord, "mimeType") ??
        (input.node.type === "image" ? "image/*" : "application/octet-stream")
    const src = getAssistantBodyStringAttr(attrRecord, "src")

    return {
        id,
        userId: "",
        organizationId: null,
        conversationId: null,
        messageId: null,
        filename: originalName,
        originalName,
        size: getAssistantBodyNumberAttr(attrRecord, "size") ?? 0,
        mimeType,
        s3Key: "",
        url: src ?? undefined,
        downloadUrl: src ?? undefined,
        width: getAssistantBodyNumberAttr(attrRecord, "width") ?? null,
        height: getAssistantBodyNumberAttr(attrRecord, "height") ?? null,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
    }
}

function getAssistantBodyStringAttr(attrs: Record<string, unknown>, key: string): string | null {
    const value = attrs[key]

    return typeof value === "string" && value.length > 0 ? value : null
}

function getAssistantBodyNumberAttr(attrs: Record<string, unknown>, key: string): number | null {
    const value = attrs[key]

    return typeof value === "number" && Number.isFinite(value) ? value : null
}
