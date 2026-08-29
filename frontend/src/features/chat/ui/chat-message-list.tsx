import { type JSX, useMemo } from "react"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import type { ContextInfo, MessageData, SenderInfo } from "../model/chat"
import { useChatPage } from "../model/chat-page.provider"
import { DateSeparator } from "./date-separator"
import { Message } from "./message/message"
import type { MessageMeta, MessageState } from "./message/message.context"

export function ChatMessageList() {
    const { state, actions } = useChatPage()
    const { displayMessages, currentConversation, pinnedMessages, messageActions, messageMeta } =
        state
    const { shouldShowSeen, findMessageReaders } = actions

    const elements = useMemo(() => {
        const result: JSX.Element[] = []
        let lastMessageDate: string | null = null
        let currentGroup: MessageData[] = []
        let currentGroupSenderInfo: SenderInfo | ContextInfo | null = null

        const TEN_MINUTES_MS = 10 * 60 * 1000

        const flushGroup = () => {
            if (currentGroup.length === 0) return

            const firstMessage = currentGroup[0]
            const isSystemMessage = firstMessage.messageType === "system"

            result.push(
                <div
                    key={`group-${firstMessage.id}`}
                    className="relative mx-auto flex w-full items-start px-4 sm:px-6"
                >
                    <div className="flex w-full items-start px-14">
                        {!isSystemMessage && currentGroupSenderInfo && (
                            <div className="sticky top-6 -ml-14 flex-shrink-0 self-start">
                                <GeneratedAvatar
                                    src={
                                        currentGroupSenderInfo.type === "organization"
                                            ? currentGroupSenderInfo.logo
                                            : currentGroupSenderInfo.image
                                    }
                                    alt={currentGroupSenderInfo.name}
                                    fallbackText={currentGroupSenderInfo.name}
                                    size="lg"
                                />
                            </div>
                        )}
                        <div
                            className={`flex flex-1 flex-col space-y-2 ${!isSystemMessage ? "ml-5" : ""}`}
                        >
                            {currentGroup.map((msg, idx) => {
                                const isLastInGroup = idx === currentGroup.length - 1
                                const messageData: MessageState = {
                                    id: msg.id,
                                    content: msg.content,
                                    messageType: msg.messageType,
                                    senderId: msg.senderId,
                                    createdAt: msg.createdAt,
                                    updatedAt: msg.updatedAt,
                                    isEdited: msg.isEdited,
                                    isDeleted: msg.isDeleted,
                                    isPinned:
                                        msg.isPinned || pinnedMessages.some((p) => p.id === msg.id),
                                    isOptimistic: false,
                                    senderInfo: !isSystemMessage
                                        ? (currentGroupSenderInfo ?? undefined)
                                        : undefined,
                                    organizationName: msg.organizationName,
                                    memberRole: msg.memberRole,
                                    hasAvatar: idx === 0,
                                    isLastInGroup,
                                    shouldShowSeen: shouldShowSeen(msg.id),
                                    readers: findMessageReaders(msg.id),
                                    metadata: msg.metadata,
                                    replyTo: msg.replyTo,
                                }

                                const perMessageMeta: MessageMeta = {
                                    ...messageMeta,
                                    requestId: msg.metadata?.requestId,
                                    requestNumber: msg.metadata?.requestNumber,
                                }

                                return (
                                    <Message.Provider
                                        key={msg.id}
                                        data={messageData}
                                        actions={messageActions}
                                        meta={perMessageMeta}
                                    >
                                        {msg.messageType === "system" ? (
                                            <Message.System />
                                        ) : (
                                            <Message.Frame>
                                                <Message.Header />
                                                <Message.Content />
                                                <Message.EditForm />
                                                <Message.Attachments />
                                            </Message.Frame>
                                        )}
                                    </Message.Provider>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )

            currentGroup = []
            currentGroupSenderInfo = null
        }

        for (const [index, message] of displayMessages.entries()) {
            const messageDate = new Date(message.createdAt).toDateString()

            if (messageDate !== lastMessageDate) {
                flushGroup()
                result.push(
                    <DateSeparator key={`separator-${message.id}`} date={message.createdAt} />
                )
                lastMessageDate = messageDate
            }

            const prevMessage = displayMessages[index - 1]
            const prevMessageDate = prevMessage
                ? new Date(prevMessage.createdAt).toDateString()
                : null

            const timeSincePrevMessage = prevMessage
                ? new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()
                : Number.MAX_SAFE_INTEGER

            const isFirstInGroup =
                !prevMessage ||
                prevMessage.messageType === "system" ||
                prevMessage.senderId !== message.senderId ||
                messageDate !== prevMessageDate ||
                timeSincePrevMessage > TEN_MINUTES_MS

            if (isFirstInGroup) {
                flushGroup()
            }

            const senderInfo: SenderInfo | ContextInfo | null = message.senderName
                ? {
                      type: "user" as const,
                      id: message.senderId,
                      name: message.senderName,
                      image: message.senderImage,
                  }
                : (currentConversation?.contextInfo ?? null)

            if (currentGroup.length === 0) {
                currentGroupSenderInfo = senderInfo
            }

            currentGroup.push(message)
        }

        flushGroup()

        return result
    }, [
        displayMessages,
        currentConversation?.contextInfo,
        shouldShowSeen,
        findMessageReaders,
        pinnedMessages,
        messageActions,
        messageMeta,
    ])

    return <>{elements}</>
}
