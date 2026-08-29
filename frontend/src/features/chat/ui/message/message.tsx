import { MessageProvider } from "./message.provider"
import { MessageAttachments } from "./message-attachments"
import { MessageContent } from "./message-content"
import { MessageEditForm } from "./message-edit-form"
import { MessageFrame } from "./message-frame"
import { MessageHeader } from "./message-header"
import { MessageToolbar } from "./message-toolbar"
import { SystemMessage } from "./system-message"

export const Message = {
    Provider: MessageProvider,
    Frame: MessageFrame,
    Header: MessageHeader,
    Content: MessageContent,
    EditForm: MessageEditForm,
    Attachments: MessageAttachments,
    Toolbar: MessageToolbar,
    System: SystemMessage,
}
