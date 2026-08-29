import { useState } from "react"
import { getSafeHttpUrl } from "@/shared/lib/validation/url.schema"
import { FileList } from "@/shared/ui/file-list"
import { AttachmentFullscreenViewer } from "./attachment-fullscreen-viewer"
import { LazyImage } from "./lazy-image"

interface Attachment {
    id: string
    filename: string
    originalName: string
    size: number
    mimeType: string
    s3Key: string
    url?: string
    downloadUrl?: string
    uploadedAt: string
    uploadedBy: string
}

interface MessageAttachmentProps {
    attachments: Attachment[]
    authorName: string
    authorImage?: string | null
}

export function MessageAttachment({
    attachments,
    authorName,
    authorImage,
}: MessageAttachmentProps) {
    const [viewerOpen, setViewerOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)

    if (!attachments || attachments.length === 0) return null

    const imageAttachments = attachments.filter((a) => a.mimeType.startsWith("image/"))
    const nonImageAttachments = attachments.filter((a) => !a.mimeType.startsWith("image/"))

    const openImageViewer = (imageIndex: number) => {
        setCurrentIndex(imageIndex)
        setViewerOpen(true)
    }

    const downloadFile = (fileIndex: number) => {
        const attachment = nonImageAttachments[fileIndex]
        const downloadUrl = getSafeHttpUrl(attachment.downloadUrl || attachment.url)
        if (downloadUrl) {
            window.location.href = downloadUrl
        }
    }

    const fileItems = nonImageAttachments.map((a) => ({
        name: a.originalName,
        size: a.size,
        type: a.mimeType,
    }))

    return (
        <div className="space-y-4">
            {imageAttachments.length > 0 && (
                <div className="scrollbar-hide flex gap-2 overflow-x-scroll">
                    {imageAttachments.map((attachment, imageIndex) => {
                        return (
                            <div
                                key={attachment.id}
                                className="flex-shrink-0 cursor-pointer overflow-hidden rounded-md border border-ds-surface-border bg-ds-gray-50 transition-all hover:border-ds-gray-400 hover:shadow-md"
                            >
                                {attachment.url && (
                                    <div className="relative h-48 w-48">
                                        <LazyImage
                                            src={attachment.url}
                                            alt={attachment.originalName}
                                            className="h-full w-full"
                                            onClick={() => openImageViewer(imageIndex)}
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {nonImageAttachments.length > 0 && (
                <div className="w-fit space-y-4">
                    <FileList
                        files={fileItems}
                        showDeleteButton={false}
                        onItemClick={downloadFile}
                    />
                </div>
            )}

            <AttachmentFullscreenViewer
                attachments={imageAttachments}
                currentIndex={currentIndex}
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                onNavigate={setCurrentIndex}
                authorName={authorName}
                authorImage={authorImage}
                uploadedAt={imageAttachments[currentIndex]?.uploadedAt || new Date().toISOString()}
            />
        </div>
    )
}
