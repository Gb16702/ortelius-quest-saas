import { MessageAttachment } from "../message-attachment"
import { useMessage } from "./message.context"

export const MessageAttachments = () => {
    const { state, permissions } = useMessage()

    if (
        state.isDeleted ||
        !state.metadata?.attachments ||
        state.metadata.attachments.length === 0
    ) {
        return null
    }

    return (
        <MessageAttachment
            attachments={state.metadata.attachments}
            authorName={permissions.senderName}
            authorImage={state.senderInfo?.image}
        />
    )
}
