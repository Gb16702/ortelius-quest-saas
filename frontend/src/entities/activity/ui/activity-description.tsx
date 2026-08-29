import { type MouseEvent, useMemo } from "react"
import type { ActivityEvent } from "../model/activity.schema"

interface ActivityDescriptionProps {
    event: ActivityEvent
    className?: string
    onOpenMemberProfile?: (userId: string) => void
    onOpenRequest?: (requestNumber: string) => void
}

type Mention = {
    text: string
    type: "user" | "request"
    id: string
    isFormerMember?: boolean
}

type Segment = { kind: "text"; text: string } | { kind: "mention"; mention: Mention }

function hasMentionText(value: string) {
    return value.trim().length > 0
}

function extractMentions(event: ActivityEvent): Mention[] {
    const meta = event.metadata ?? {}
    const mentions: Mention[] = []

    if (
        typeof meta.userName === "string" &&
        hasMentionText(meta.userName) &&
        typeof meta.userId === "string"
    ) {
        mentions.push({
            text: meta.userName,
            type: "user",
            id: meta.userId,
            isFormerMember: event.mentionedUserIsFormerMember === true,
        })
    }

    if (typeof meta.reqNumber === "string" && hasMentionText(meta.reqNumber)) {
        mentions.push({
            text: meta.reqNumber,
            type: "request",
            id: meta.reqNumber,
        })
    }

    return mentions
}

function parseDescription(description: string, mentions: Mention[]): Segment[] {
    if (mentions.length === 0) {
        return [{ kind: "text", text: description }]
    }

    const segments: Segment[] = []
    let remaining = description

    while (remaining.length > 0) {
        let nextMatch: { mention: Mention; index: number } | null = null

        for (const mention of mentions) {
            const index = remaining.indexOf(mention.text)
            if (index === -1) continue
            if (!nextMatch || index < nextMatch.index) {
                nextMatch = { mention, index }
            }
        }

        if (!nextMatch) {
            segments.push({ kind: "text", text: remaining })
            break
        }

        if (nextMatch.index > 0) {
            segments.push({
                kind: "text",
                text: remaining.slice(0, nextMatch.index),
            })
        }
        segments.push({ kind: "mention", mention: nextMatch.mention })
        remaining = remaining.slice(nextMatch.index + nextMatch.mention.text.length)
    }

    return segments
}

export function ActivityDescription({
    event,
    className,
    onOpenMemberProfile,
    onOpenRequest,
}: ActivityDescriptionProps) {
    const segments = useMemo(
        () => parseDescription(event.description, extractMentions(event)),
        [event.description, event.metadata, event.mentionedUserIsFormerMember, event]
    )

    const handleMentionClick = (mention: Mention, e: MouseEvent) => {
        e.stopPropagation()
        if (mention.type === "user") {
            onOpenMemberProfile?.(mention.id)
            return
        }
        onOpenRequest?.(mention.id)
    }

    return (
        <span className={className}>
            {segments.map((segment, i) => {
                if (segment.kind === "text") {
                    // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                    return <span key={i}>{segment.text}</span>
                }
                const { mention } = segment
                if (mention.type === "user" && mention.isFormerMember) {
                    return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                        <span key={i} className="font-medium text-ds-fg">
                            {mention.text}
                        </span>
                    )
                }
                const canOpenMention =
                    mention.type === "user" ? !!onOpenMemberProfile : !!onOpenRequest

                if (!canOpenMention) {
                    return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                        <span key={i} className="font-medium text-ds-fg">
                            {mention.text}
                        </span>
                    )
                }

                return (
                    <button
                        // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                        key={i}
                        type="button"
                        onClick={(e) => handleMentionClick(mention, e)}
                        className="cursor-pointer font-medium text-ds-fg underline"
                    >
                        {mention.text}
                    </button>
                )
            })}
        </span>
    )
}
