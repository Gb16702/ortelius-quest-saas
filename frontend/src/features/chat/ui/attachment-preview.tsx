import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import { FileList } from "@/shared/ui/file-list"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { AttachmentFullscreenViewer } from "./attachment-fullscreen-viewer"

interface AttachmentPreviewProps {
    files: File[]
    onRemove: (index: number) => void
}

function getFilePreviewKey(file: File): string {
    return `${file.name}:${file.size}:${file.type}:${file.lastModified}`
}

export function AttachmentPreview({ files, onRemove }: AttachmentPreviewProps) {
    const { t } = useTranslation("chat")
    const [viewerOpen, setViewerOpen] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [previews, setPreviews] = useState<Map<string, string>>(new Map())

    useEffect(() => {
        const activeKeys = new Set(files.map(getFilePreviewKey))
        setPreviews((prev) => new Map([...prev].filter(([key]) => activeKeys.has(key))))

        let isActive = true

        files.forEach((file) => {
            if (file.type.startsWith("image/")) {
                const key = getFilePreviewKey(file)
                const reader = new FileReader()
                reader.onload = (e) => {
                    if (isActive && e.target?.result) {
                        setPreviews((prev) => new Map(prev).set(key, e.target?.result as string))
                    }
                }
                reader.readAsDataURL(file)
            }
        })

        return () => {
            isActive = false
        }
    }, [files])

    if (files.length === 0) return null

    const imageFiles = files.filter((f) => f.type.startsWith("image/"))
    const nonImageFiles = files.filter((f) => !f.type.startsWith("image/"))

    const imageAttachments = imageFiles.map((file) => {
        const key = getFilePreviewKey(file)
        return {
            id: `preview-${key}`,
            filename: file.name,
            originalName: file.name,
            size: file.size,
            mimeType: file.type,
            s3Key: "",
            url: previews.get(key) || "",
            uploadedAt: new Date().toISOString(),
            uploadedBy: t("attachment.you"),
        }
    })

    const openPreview = (imageIndex: number) => {
        setCurrentIndex(imageIndex)
        setViewerOpen(true)
    }

    return (
        <>
            <div className="scrollbar-hide flex gap-2 overflow-x-scroll px-3 pt-2">
                {imageFiles.map((file, imageIndex) => {
                    const index = files.indexOf(file)
                    const preview = previews.get(getFilePreviewKey(file))

                    return (
                        // biome-ignore lint/a11y/useSemanticElements: role chosen intentionally; semantic-element refactor pending
                        <div
                            key={getFilePreviewKey(file)}
                            className="group relative flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center"
                            onClick={() => openPreview(imageIndex)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    openPreview(imageIndex)
                                }
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            {preview && (
                                <img
                                    src={preview}
                                    alt={file.name}
                                    className="h-full w-full rounded-md border border-ds-surface-border object-cover"
                                />
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant={"outline"}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRemove(index)
                                        }}
                                        className="!p-0 absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <X className="size-3 stroke-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t("attachment.remove")}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )
                })}
                {nonImageFiles.length > 0 && (
                    <FileList
                        files={nonImageFiles}
                        onRemoveFile={(fileIndex) => {
                            const actualIndex = files.indexOf(nonImageFiles[fileIndex])
                            onRemove(actualIndex)
                        }}
                        showDeleteButton={true}
                    />
                )}
            </div>

            <AttachmentFullscreenViewer
                attachments={imageAttachments}
                currentIndex={currentIndex}
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                onNavigate={setCurrentIndex}
                authorName={t("attachment.you")}
                authorImage={null}
                uploadedAt={new Date().toISOString()}
                showAuthorInfo={false}
            />
        </>
    )
}
