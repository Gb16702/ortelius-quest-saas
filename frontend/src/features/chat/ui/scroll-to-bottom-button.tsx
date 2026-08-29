import { ArrowDown } from "lucide-react"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useStickToBottomContext } from "use-stick-to-bottom"
import { Button } from "@/shared/ui/button"
import { useChatPage } from "../model/chat-page.provider"

export function ScrollToBottomButton() {
    const { t } = useTranslation("chat")
    const { isAtBottom, scrollToBottom } = useStickToBottomContext()
    const { state, actions, meta } = useChatPage()
    const { refs } = meta

    useEffect(() => {
        refs.scrollToBottomRef.current = scrollToBottom
    }, [scrollToBottom, refs.scrollToBottomRef])

    useEffect(() => {
        if (state.shouldScrollToBottom) {
            setTimeout(() => {
                scrollToBottom()
                actions.setShouldScrollToBottom(false)
            }, 50)
        }
    }, [state.shouldScrollToBottom, scrollToBottom, actions])

    const handleClick = useCallback(() => {
        scrollToBottom()
    }, [scrollToBottom])

    if (isAtBottom) return null

    return (
        <div className="pointer-events-none absolute right-0 bottom-42 left-0 z-10 flex justify-center">
            <Button
                variant={"outline"}
                type="button"
                onClick={handleClick}
                className="pointer-events-auto h-9 w-9 rounded-full shadow-lg"
                aria-label={t("scrollToBottom.aria")}
            >
                <ArrowDown className="size-4" />
            </Button>
        </div>
    )
}
