export const CONVERSATION_ATTACHMENT_FILE_CONFIG = {
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
    acceptedFormats: ["PDF", "JPG", "JPEG", "PNG", "WEBP"] as const,
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const,
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
}
