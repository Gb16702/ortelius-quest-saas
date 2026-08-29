import type { RefObject } from "react"
import type { StickToBottomContext } from "use-stick-to-bottom"

export function findMessageElement(messageId: string): HTMLElement | null {
    const escapedMessageId =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
            ? CSS.escape(messageId)
            : messageId

    return document.querySelector<HTMLElement>(`[data-message-id="${escapedMessageId}"]`)
}

export async function waitForMessageElement(
    messageId: string,
    attempts = 3
): Promise<HTMLElement | null> {
    for (let i = 0; i < attempts; i += 1) {
        const messageElement = findMessageElement(messageId)
        if (messageElement) return messageElement

        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve())
        })
    }

    return findMessageElement(messageId)
}

export function findScrollableAncestor(
    element: HTMLElement,
    stickToBottomContextRef: RefObject<StickToBottomContext | null>
): HTMLElement | null {
    let parent = element.parentElement

    while (parent) {
        const { overflowY } = window.getComputedStyle(parent)
        const canScroll = overflowY === "auto" || overflowY === "scroll"

        if (canScroll && parent.scrollHeight > parent.clientHeight) {
            return parent
        }

        parent = parent.parentElement
    }

    return stickToBottomContextRef.current?.scrollRef.current ?? null
}

export function highlightMessageElement(
    messageElement: HTMLElement,
    stickToBottomContextRef: RefObject<StickToBottomContext | null>
): void {
    stickToBottomContextRef.current?.stopScroll()

    const scrollElement = findScrollableAncestor(messageElement, stickToBottomContextRef)

    if (scrollElement) {
        const containerRect = scrollElement.getBoundingClientRect()
        const messageRect = messageElement.getBoundingClientRect()
        const centeredOffset =
            messageRect.top - containerRect.top - containerRect.height / 2 + messageRect.height / 2

        scrollElement.scrollTop += centeredOffset
    } else {
        messageElement.scrollIntoView({
            block: "center",
        })
    }

    messageElement.classList.add("message-highlight")

    setTimeout(() => {
        messageElement.classList.remove("message-highlight")
    }, 5000)
}
