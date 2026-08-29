import * as v from "valibot"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

const QUEST_ASSISTANT_OPEN_CONVERSATION_EVENT = "quest-assistant:open-conversation"

const questAssistantOpenConversationEventSchema = v.object({
    conversationId: v.string(),
})

interface QuestAssistantOpenConversationEventDetail {
    conversationId: string
}

export function requestQuestAssistantConversationOpen(conversationId: string): void {
    if (typeof window === "undefined") return

    window.dispatchEvent(
        new CustomEvent<QuestAssistantOpenConversationEventDetail>(
            QUEST_ASSISTANT_OPEN_CONVERSATION_EVENT,
            {
                detail: { conversationId },
            }
        )
    )
}

export function subscribeQuestAssistantConversationOpen(
    listener: (conversationId: string) => void
): () => void {
    if (typeof window === "undefined") return () => undefined

    const handleOpenConversation = (event: Event) => {
        if (!(event instanceof CustomEvent)) return

        const parsed = safeParseSchema(questAssistantOpenConversationEventSchema, event.detail)
        if (!parsed.success) return

        listener(parsed.output.conversationId)
    }

    window.addEventListener(QUEST_ASSISTANT_OPEN_CONVERSATION_EVENT, handleOpenConversation)

    return () => {
        window.removeEventListener(QUEST_ASSISTANT_OPEN_CONVERSATION_EVENT, handleOpenConversation)
    }
}
