import {
    ChevronLeft,
    ChevronRight,
    CloudDownload,
    FileText,
    SquareArrowOutUpRight,
    X,
    ZoomIn,
    ZoomOut,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { formatSearchDate } from "@/shared/lib/date"
import { formatFileSize } from "@/shared/lib/file-size"
import { getSafeHttpUrl } from "@/shared/lib/validation/url.schema"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import { Dialog, DialogContent } from "@/shared/ui/dialog"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

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

interface AttachmentFullscreenViewerProps {
    attachments: Attachment[]
    currentIndex: number
    isOpen: boolean
    onClose: () => void
    onNavigate: (index: number) => void
    authorName: string
    authorImage?: string | null
    uploadedAt: string
    showAuthorInfo?: boolean
}

export function AttachmentFullscreenViewer({
    attachments,
    currentIndex,
    isOpen,
    onClose,
    onNavigate,
    authorName,
    authorImage,
    uploadedAt,
    showAuthorInfo = true,
}: AttachmentFullscreenViewerProps) {
    const { t } = useTranslation("chat")
    const currentAttachment = attachments[currentIndex]
    const [isZoomed, setIsZoomed] = useState(false)

    useEffect(() => {
        setIsZoomed(false)
    }, [])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            switch (e.key) {
                case "Escape":
                    if (isZoomed) {
                        setIsZoomed(false)
                    } else {
                        onClose()
                    }
                    break
                case "ArrowLeft":
                    if (currentIndex > 0) {
                        onNavigate(currentIndex - 1)
                    }
                    break
                case "ArrowRight":
                    if (currentIndex < attachments.length - 1) {
                        onNavigate(currentIndex + 1)
                    }
                    break
            }
        }

        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [isOpen, currentIndex, attachments.length, onClose, onNavigate, isZoomed])

    const downloadAttachment = async () => {
        const downloadUrl = getSafeHttpUrl(currentAttachment?.downloadUrl || currentAttachment?.url)
        if (!downloadUrl) return

        try {
            window.location.href = downloadUrl
        } catch (error) {
            console.error("Download failed:", error)
        }
    }

    const openInNewWindow = () => {
        const url = getSafeHttpUrl(currentAttachment?.url)
        if (!url) return
        window.open(url, "_blank", "noopener,noreferrer")
    }

    const toggleZoom = () => {
        setIsZoomed(!isZoomed)
    }

    if (!currentAttachment) return null

    const isImage = currentAttachment.mimeType.startsWith("image/")
    const isPDF = currentAttachment.mimeType === "application/pdf"

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="h-[calc(100%-16px)] min-w-[calc(100%-16px)] p-0"
            >
                <div className="grid h-full grid-rows-[auto_1fr_auto] gap-4 p-4">
                    <div className="flex items-center justify-between">
                        {showAuthorInfo ? (
                            <div className="flex items-center gap-3 rounded-full py-2">
                                <GeneratedAvatar
                                    src={authorImage}
                                    fallbackText={authorName}
                                    alt={`${authorName} avatar`}
                                />
                                <div className="flex flex-col">
                                    <span className="font-medium text-ds-fg text-sm">
                                        {authorName}
                                    </span>
                                    <span className="text-ds-fg-muted text-xs">
                                        {formatSearchDate(uploadedAt)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col py-2">
                                <span className="font-medium text-ds-fg text-sm">
                                    {currentAttachment.originalName}
                                </span>
                                <span className="text-ds-fg-muted text-xs">
                                    {formatFileSize(currentAttachment.size)}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <ButtonGroup className="pointer-events-auto [&_a:hover]:border-ds-surface-border [&_button:hover]:border-ds-surface-border">
                                {isImage && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                radius="full"
                                                variant="outline"
                                                size="sm"
                                                onClick={toggleZoom}
                                            >
                                                {isZoomed ? (
                                                    <ZoomOut className="size-4" />
                                                ) : (
                                                    <ZoomIn className="size-4" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>
                                                {isZoomed
                                                    ? t("attachment.zoomOut")
                                                    : t("attachment.zoomIn")}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            radius="full"
                                            variant="outline"
                                            size="sm"
                                            onClick={downloadAttachment}
                                        >
                                            <CloudDownload className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t("attachment.download")}</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            radius="full"
                                            variant="outline"
                                            size="sm"
                                            onClick={openInNewWindow}
                                        >
                                            <SquareArrowOutUpRight className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t("attachment.openNewWindow")}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </ButtonGroup>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        className="!p-0 w-8"
                                        radius="full"
                                        variant="outline"
                                        size="sm"
                                        onClick={onClose}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t("attachment.close")}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div
                        className={`relative flex min-h-0 items-center justify-center ${isZoomed ? "cursor-move overflow-auto" : "overflow-hidden"}`}
                    >
                        {isImage && currentAttachment.url ? (
                            <div className="relative flex h-full w-full items-center justify-center">
                                <img
                                    src={currentAttachment.url}
                                    alt={currentAttachment.originalName}
                                    className={`h-auto w-auto object-contain transition-transform duration-300 ${
                                        isZoomed
                                            ? "max-h-none max-w-none scale-200 cursor-move"
                                            : "max-h-full max-w-full"
                                    }`}
                                    style={isZoomed ? { transform: "scale(2)" } : undefined}
                                />
                            </div>
                        ) : isPDF && getSafeHttpUrl(currentAttachment.url) ? (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-white">
                                <FileText className="h-24 w-24 text-ds-danger-text" />
                                <div className="text-center">
                                    <p className="font-medium text-xl">
                                        {currentAttachment.originalName}
                                    </p>
                                    <p className="mt-2 text-gray-400 text-sm">
                                        {formatFileSize(currentAttachment.size)}
                                    </p>
                                </div>
                                <Button
                                    onClick={downloadAttachment}
                                    className="mt-4"
                                    variant="solid"
                                >
                                    <CloudDownload className="mr-2 h-4 w-4" />
                                    {t("attachment.downloadPdfLabel")}
                                </Button>
                                <a
                                    href={getSafeHttpUrl(currentAttachment.url) ?? undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 text-gray-400 text-sm underline hover:text-white"
                                >
                                    {t("attachment.openNewTab")}
                                </a>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-4 text-white">
                                <FileText className="h-24 w-24 text-gray-400" />
                                <div className="text-center">
                                    <p className="font-medium text-xl">
                                        {currentAttachment.originalName}
                                    </p>
                                    <p className="mt-2 text-gray-400 text-sm">
                                        {formatFileSize(currentAttachment.size)}
                                    </p>
                                </div>
                                <Button
                                    onClick={downloadAttachment}
                                    className="mt-4"
                                    variant="solid"
                                >
                                    <CloudDownload className="mr-2 h-4 w-4" />
                                    {t("attachment.downloadFileLabel")}
                                </Button>
                            </div>
                        )}

                        {/* Navigation arrows */}
                        {attachments.length > 1 && (
                            <>
                                {currentIndex > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                radius={"full"}
                                                onClick={() => onNavigate(currentIndex - 1)}
                                                className="!p-0 absolute top-1/2 left-4 h-8 w-8 -translate-y-1/2"
                                                aria-label={t("attachment.previousAria")}
                                            >
                                                <ChevronLeft className="size-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t("attachment.previous")}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                {currentIndex < attachments.length - 1 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                radius={"full"}
                                                onClick={() => onNavigate(currentIndex + 1)}
                                                className="!p-0 absolute top-1/2 right-4 h-8 w-8 -translate-y-1/2"
                                                aria-label={t("attachment.nextAria")}
                                            >
                                                <ChevronRight className="size-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t("attachment.next")}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
