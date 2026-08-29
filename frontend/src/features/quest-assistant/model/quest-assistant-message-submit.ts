export function canSubmitAssistantMessage(input: {
    message: string
    selectedAttachmentCount: number
    isStreaming: boolean
    uploadingFileCount: number
}): boolean {
    return (
        (input.message.length > 0 || input.selectedAttachmentCount > 0) &&
        !input.isStreaming &&
        input.uploadingFileCount === 0
    )
}
