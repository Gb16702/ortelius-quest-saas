import type { Conversation, MessageData } from "./chat"

export interface ReplyingTo {
    messageId: string
    content: string
    senderName: string
}

export interface EditingMessage {
    messageId: string
    content: string
}

export interface DeletingMessage {
    id: string
    content: string
    senderName: string
    senderImage?: string | null
    createdAt: string
}

export interface ChatState {
    conversations: Conversation[]
    allMessages: MessageData[]
    isInitialLoading: boolean
    isSubmitting: boolean
    isUploadingFiles: boolean
    isExporting: boolean
    isSearchDialogOpen: boolean
    isParticipantsDialogOpen: boolean
    selectedFiles: File[]
    replyingTo: ReplyingTo | null
    editingMessage: EditingMessage | null
    deletingMessage: DeletingMessage | null
}

export type ChatAction =
    | { type: "SET_CONVERSATIONS"; conversations: Conversation[] }
    | { type: "SET_ALL_MESSAGES"; messages: MessageData[] }
    | { type: "MERGE_MESSAGES"; messages: MessageData[] }
    | { type: "ADD_MESSAGE"; message: MessageData }
    | { type: "UPDATE_MESSAGE"; messageId: string; updates: Partial<MessageData> }
    | { type: "DELETE_MESSAGE"; messageId: string }
    | { type: "MARK_CONVERSATION_READ"; conversationId: string }
    | {
          type: "SET_CONVERSATION_PINNED_STATE"
          conversationId: string
          isPinned: boolean
          pinnedAt: string
      }
    | { type: "SET_INITIAL_LOADING"; loading: boolean }
    | { type: "SET_SUBMITTING"; submitting: boolean }
    | { type: "SET_UPLOADING_FILES"; uploading: boolean }
    | { type: "SET_EXPORTING"; exporting: boolean }
    | { type: "OPEN_SEARCH_DIALOG" }
    | { type: "CLOSE_SEARCH_DIALOG" }
    | { type: "OPEN_PARTICIPANTS_DIALOG" }
    | { type: "CLOSE_PARTICIPANTS_DIALOG" }
    | { type: "SET_SELECTED_FILES"; files: File[] }
    | { type: "ADD_SELECTED_FILES"; files: File[] }
    | { type: "CLEAR_SELECTED_FILES" }
    | { type: "SET_REPLYING_TO"; replyingTo: ReplyingTo | null }
    | { type: "CLEAR_REPLYING_TO" }
    | { type: "SET_EDITING_MESSAGE"; editingMessage: EditingMessage | null }
    | { type: "CLEAR_EDITING_MESSAGE" }
    | { type: "SET_DELETING_MESSAGE"; deletingMessage: DeletingMessage | null }
    | { type: "CLEAR_DELETING_MESSAGE" }

export const initialChatState: ChatState = {
    conversations: [],
    allMessages: [],
    isInitialLoading: true,
    isSubmitting: false,
    isUploadingFiles: false,
    isExporting: false,
    isSearchDialogOpen: false,
    isParticipantsDialogOpen: false,
    selectedFiles: [],
    replyingTo: null,
    editingMessage: null,
    deletingMessage: null,
}

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
    switch (action.type) {
        case "SET_CONVERSATIONS":
            return { ...state, conversations: action.conversations }
        case "SET_ALL_MESSAGES":
            return { ...state, allMessages: action.messages }
        case "MERGE_MESSAGES": {
            const existingIds = new Set(state.allMessages.map((message) => message.id))
            const newMessages = action.messages.filter((message) => !existingIds.has(message.id))
            if (newMessages.length === 0) return state
            return { ...state, allMessages: [...state.allMessages, ...newMessages] }
        }
        case "ADD_MESSAGE":
            return { ...state, allMessages: [...state.allMessages, action.message] }
        case "MARK_CONVERSATION_READ": {
            const conversationToMark = state.conversations.find(
                (conversation) => conversation.id === action.conversationId
            )

            if (!conversationToMark?.lastMessage?.isUnread) return state

            return {
                ...state,
                conversations: state.conversations.map((conversation) =>
                    conversation.id === action.conversationId && conversation.lastMessage
                        ? {
                              ...conversation,
                              lastMessage: {
                                  ...conversation.lastMessage,
                                  isUnread: false,
                              },
                          }
                        : conversation
                ),
            }
        }
        case "SET_CONVERSATION_PINNED_STATE":
            return {
                ...state,
                conversations: state.conversations.map((conversation) =>
                    conversation.id === action.conversationId
                        ? {
                              ...conversation,
                              isPinned: action.isPinned,
                              pinnedAt: action.isPinned
                                  ? (conversation.pinnedAt ?? action.pinnedAt)
                                  : null,
                          }
                        : conversation
                ),
            }
        case "UPDATE_MESSAGE": {
            const messageToUpdate = state.allMessages.find((m) => m.id === action.messageId)
            if (!messageToUpdate) {
                return state
            }

            const updatedContent = action.updates.content
            const updatedMessages = state.allMessages.map((msg) => {
                if (msg.id === action.messageId) {
                    return { ...msg, ...action.updates }
                }

                if (msg.replyTo?.id === action.messageId && updatedContent !== undefined) {
                    return {
                        ...msg,
                        replyTo: { ...msg.replyTo, content: updatedContent },
                    }
                }

                return msg
            })

            return {
                ...state,
                allMessages: updatedMessages,
            }
        }
        case "DELETE_MESSAGE": {
            const messageToDelete = state.allMessages.find((m) => m.id === action.messageId)
            if (messageToDelete?.isDeleted) {
                return state
            }
            const deletedMessages = state.allMessages.map((msg) => {
                if (msg.id === action.messageId) {
                    return { ...msg, isDeleted: true }
                }
                if (msg.replyTo?.id === action.messageId) {
                    return {
                        ...msg,
                        replyTo: { ...msg.replyTo, isDeleted: true },
                    }
                }
                return msg
            })
            return {
                ...state,
                allMessages: deletedMessages,
            }
        }
        case "SET_INITIAL_LOADING":
            return { ...state, isInitialLoading: action.loading }
        case "SET_SUBMITTING":
            return { ...state, isSubmitting: action.submitting }
        case "SET_UPLOADING_FILES":
            return { ...state, isUploadingFiles: action.uploading }
        case "SET_EXPORTING":
            return { ...state, isExporting: action.exporting }
        case "OPEN_SEARCH_DIALOG":
            return { ...state, isSearchDialogOpen: true }
        case "CLOSE_SEARCH_DIALOG":
            return { ...state, isSearchDialogOpen: false }
        case "OPEN_PARTICIPANTS_DIALOG":
            return { ...state, isParticipantsDialogOpen: true }
        case "CLOSE_PARTICIPANTS_DIALOG":
            return { ...state, isParticipantsDialogOpen: false }
        case "SET_SELECTED_FILES":
            return { ...state, selectedFiles: action.files }
        case "ADD_SELECTED_FILES":
            return {
                ...state,
                selectedFiles: [...state.selectedFiles, ...action.files],
            }
        case "CLEAR_SELECTED_FILES":
            return { ...state, selectedFiles: [] }
        case "SET_REPLYING_TO":
            return { ...state, replyingTo: action.replyingTo }
        case "CLEAR_REPLYING_TO":
            return { ...state, replyingTo: null }
        case "SET_EDITING_MESSAGE":
            return { ...state, editingMessage: action.editingMessage }
        case "CLEAR_EDITING_MESSAGE":
            return { ...state, editingMessage: null }
        case "SET_DELETING_MESSAGE":
            return { ...state, deletingMessage: action.deletingMessage }
        case "CLEAR_DELETING_MESSAGE":
            return { ...state, deletingMessage: null }
        default:
            return state
    }
}
