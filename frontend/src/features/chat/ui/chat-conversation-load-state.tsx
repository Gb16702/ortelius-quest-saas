import { Link } from "@tanstack/react-router"
import { LockKeyhole, MessageCircleWarning, SearchX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/shared/ui/empty"
import type { ChatConversationLoadStatus } from "../model/chat-conversation-access"

interface ChatConversationLoadStateProps {
    status: Exclude<ChatConversationLoadStatus, "loading" | "ready">
    chatsHref: string
    onNavigate?: (href: string) => void
    onRetry: () => void
}

const iconByStatus = {
    forbidden: LockKeyhole,
    "not-found": SearchX,
    error: MessageCircleWarning,
} satisfies Record<
    Exclude<ChatConversationLoadStatus, "loading" | "ready">,
    typeof MessageCircleWarning
>

const titleKeyByStatus = {
    forbidden: "conversation.forbidden.title",
    "not-found": "conversation.notFound.title",
    error: "conversation.error.title",
} as const

const descriptionKeyByStatus = {
    forbidden: "conversation.forbidden.description",
    "not-found": "conversation.notFound.description",
    error: "conversation.error.description",
} as const

export function ChatConversationLoadState({
    status,
    chatsHref,
    onRetry,
}: ChatConversationLoadStateProps) {
    const { t } = useTranslation("chat")
    const Icon = iconByStatus[status]

    return (
        <Empty className="min-h-[360px] border-0 bg-transparent px-4">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon />
                </EmptyMedia>
                <EmptyTitle>{t(titleKeyByStatus[status])}</EmptyTitle>
                <EmptyDescription>{t(descriptionKeyByStatus[status])}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                {status === "error" && (
                    <Button radius="full" variant="outline" onClick={onRetry}>
                        {t("conversation.tryAgain")}
                    </Button>
                )}
                <Button asChild radius="full" variant={status === "error" ? "ghost" : "outline"}>
                    <Link to={chatsHref}>{t("conversation.backToChats")}</Link>
                </Button>
            </EmptyContent>
        </Empty>
    )
}
