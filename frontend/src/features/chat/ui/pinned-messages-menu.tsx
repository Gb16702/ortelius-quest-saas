import { PinOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import { useChatPage } from "../model/chat-page.provider"

export function PinnedMessagesMenuContent() {
    const { t } = useTranslation("chat")
    const { state, actions, meta } = useChatPage()
    const { currentConversation, pinnedMessages } = state

    if (pinnedMessages.length === 0) {
        return <div className="p-4 text-center text-ds-fg-subtle text-sm">{t("pinned.empty")}</div>
    }

    return (
        <>
            {pinnedMessages.map((msg) => {
                const canUnpinMessage =
                    msg.senderId === meta.userId ||
                    currentConversation?.role === "admin" ||
                    currentConversation?.role === "owner"

                return (
                    <div
                        key={msg.id}
                        className="group relative rounded-sm px-2 py-2 hover:bg-ds-surface-hover"
                    >
                        <div className="flex flex-col items-start gap-1 pr-16">
                            <span className="text-ds-fg-subtle text-xs">{msg.senderName}</span>
                            <span className="line-clamp-2 text-sm">{msg.content}</span>
                        </div>
                        <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                            <ButtonGroup>
                                <Button
                                    size="xs"
                                    variant="outline"
                                    radius="full"
                                    onClick={() => actions.scrollToMessage(msg.id)}
                                >
                                    {t("pinned.goTo")}
                                </Button>
                                {canUnpinMessage && (
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        radius="full"
                                        onClick={() => actions.unpinMessage(msg.id)}
                                    >
                                        <PinOff className="size-3.5" />
                                    </Button>
                                )}
                            </ButtonGroup>
                        </div>
                    </div>
                )
            })}
        </>
    )
}
