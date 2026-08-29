import { formatFileSize } from "@/shared/lib/file-size"

const ACCEPTED_LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

export const BRANDING_LOGO_UPLOAD_CONFIG = {
    accept: "image/png,image/jpeg,image/webp",
    acceptedFormatsLabel: "PNG, JPEG, or WEBP",
    maxSize: 5 * 1024 * 1024,
} as const

export function getBrandingLogoFileValidationError(file: File): string | null {
    if (!ACCEPTED_LOGO_MIME_TYPES.has(file.type)) {
        return `Logo must be a ${BRANDING_LOGO_UPLOAD_CONFIG.acceptedFormatsLabel} image.`
    }

    if (file.size > BRANDING_LOGO_UPLOAD_CONFIG.maxSize) {
        return `Logo must be ${formatFileSize(BRANDING_LOGO_UPLOAD_CONFIG.maxSize)} or smaller.`
    }

    return null
}
