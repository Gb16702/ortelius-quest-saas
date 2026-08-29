import {
    Check,
    FileText,
    Image as ImageIcon,
    Library,
    LoaderCircle,
    Paperclip,
    Plus,
    Search,
    X,
} from "lucide-react"
import type { UIEvent } from "react"
import { Button } from "@/shared/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Input } from "@/shared/ui/input"
import type { AssistantAttachment } from "../model/quest-assistant"

export function AssistantAttachmentMenu({
    open,
    disabled,
    recentAttachments,
    selectedAttachmentIds,
    isLoadingRecentAttachments,
    onOpenChange,
    onChooseFiles,
    onOpenLibrary,
    onSelectAttachment,
}: {
    open: boolean
    disabled: boolean
    recentAttachments: AssistantAttachment[]
    selectedAttachmentIds: ReadonlySet<string>
    isLoadingRecentAttachments: boolean
    onOpenChange: (open: boolean) => void
    onChooseFiles: () => void
    onOpenLibrary: () => void
    onSelectAttachment: (attachment: AssistantAttachment) => void
}) {
    return (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    radius="full"
                    disabled={disabled}
                    aria-label="Add files"
                >
                    <Plus className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-64">
                <DropdownMenuItem onSelect={onChooseFiles}>
                    <Paperclip className="size-4" />
                    Add photos & files
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Library className="size-4" />
                        Recent files
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-80">
                        <DropdownMenuItem onSelect={onOpenLibrary}>
                            <Library className="size-4" />
                            Add from library
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-ds-fg-muted">Recents</DropdownMenuLabel>
                        {isLoadingRecentAttachments ? (
                            <DropdownMenuItem disabled>
                                <LoaderCircle className="size-4 animate-spin" />
                                Loading files
                            </DropdownMenuItem>
                        ) : recentAttachments.length === 0 ? (
                            <DropdownMenuItem disabled>No recent files</DropdownMenuItem>
                        ) : (
                            recentAttachments.map((attachment) => (
                                <DropdownMenuItem
                                    key={attachment.id}
                                    disabled={selectedAttachmentIds.has(attachment.id)}
                                    onSelect={() => onSelectAttachment(attachment)}
                                    className="items-start"
                                >
                                    <AssistantAttachmentThumb attachment={attachment} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-ds-fg">
                                            {attachment.originalName}
                                        </span>
                                        <span className="block text-ds-fg-muted text-xs">
                                            {formatAssistantAttachmentDate(attachment.createdAt)}
                                        </span>
                                    </span>
                                    {selectedAttachmentIds.has(attachment.id) && (
                                        <Check className="size-4" />
                                    )}
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function AssistantComposerAttachments({
    attachments,
    uploadingFiles,
    onRemoveAttachment,
}: {
    attachments: AssistantAttachment[]
    uploadingFiles: File[]
    onRemoveAttachment: (attachmentId: string) => void
}) {
    if (attachments.length === 0 && uploadingFiles.length === 0) return null

    return (
        <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
                <div
                    key={attachment.id}
                    className="flex max-w-[220px] items-center gap-2 rounded-md border border-ds-surface-border bg-ds-canvas px-2 py-1.5 text-sm"
                >
                    <AssistantAttachmentThumb attachment={attachment} />
                    <span className="min-w-0 flex-1 truncate">{attachment.originalName}</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => onRemoveAttachment(attachment.id)}
                        aria-label={`Remove ${attachment.originalName}`}
                    >
                        <X className="size-3.5" />
                    </Button>
                </div>
            ))}
            {uploadingFiles.map((file) => (
                <div
                    key={`${file.name}-${file.lastModified}-${file.size}`}
                    className="flex max-w-[220px] items-center gap-2 rounded-md border border-ds-surface-border bg-ds-canvas px-2 py-1.5 text-ds-fg-muted text-sm"
                >
                    <AssistantFileIcon mimeType={file.type} />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <LoaderCircle className="size-3.5 animate-spin" />
                </div>
            ))}
        </div>
    )
}

export function AssistantAttachmentLibraryDialog({
    open,
    search,
    attachments,
    selectedAttachmentIds,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    onOpenChange,
    onSearchChange,
    onLoadMore,
    onSelectAttachment,
}: {
    open: boolean
    search: string
    attachments: AssistantAttachment[]
    selectedAttachmentIds: ReadonlySet<string>
    isLoading: boolean
    isFetchingNextPage: boolean
    hasNextPage: boolean
    onOpenChange: (open: boolean) => void
    onSearchChange: (search: string) => void
    onLoadMore: () => void
    onSelectAttachment: (attachment: AssistantAttachment) => void
}) {
    const handleScroll = (event: UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget
        const remaining = target.scrollHeight - target.scrollTop - target.clientHeight

        if (remaining < 96 && hasNextPage && !isFetchingNextPage) {
            onLoadMore()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[min(720px,86vh)] max-w-2xl overflow-hidden border border-ds-surface-border p-0">
                <DialogHeader className="border-ds-surface-border border-b px-5 py-4">
                    <DialogTitle className="text-lg">Add from library</DialogTitle>
                    <DialogDescription className="sr-only">
                        Select a recently uploaded assistant file
                    </DialogDescription>
                </DialogHeader>
                <div className="border-ds-surface-border border-b p-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                        <Input
                            value={search}
                            onChange={(event) => onSearchChange(event.currentTarget.value)}
                            placeholder="Search library"
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3" onScroll={handleScroll}>
                    {isLoading ? (
                        <div className="flex h-48 items-center justify-center text-ds-fg-muted text-sm">
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                            Loading files
                        </div>
                    ) : attachments.length === 0 ? (
                        <div className="flex h-48 items-center justify-center text-ds-fg-muted text-sm">
                            No files found.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {attachments.map((attachment) => {
                                const isSelected = selectedAttachmentIds.has(attachment.id)

                                return (
                                    <button
                                        key={attachment.id}
                                        type="button"
                                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-ds-surface-interactive data-[selected=true]:bg-ds-surface-interactive"
                                        data-selected={isSelected}
                                        onClick={() => onSelectAttachment(attachment)}
                                    >
                                        <AssistantAttachmentThumb attachment={attachment} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium text-ds-fg text-sm">
                                                {attachment.originalName}
                                            </span>
                                            <span className="block text-ds-fg-muted text-xs">
                                                {formatAssistantAttachmentDate(
                                                    attachment.createdAt
                                                )}
                                            </span>
                                        </span>
                                        {isSelected && <Check className="size-4 text-ds-accent" />}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    {isFetchingNextPage && (
                        <div className="flex h-12 items-center justify-center text-ds-fg-muted">
                            <LoaderCircle className="size-4 animate-spin" />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function AssistantAttachmentThumb({ attachment }: { attachment: AssistantAttachment }) {
    if (attachment.mimeType.startsWith("image/") && attachment.url) {
        return (
            <img
                src={attachment.url}
                alt={attachment.originalName}
                className="size-8 shrink-0 rounded-sm object-cover"
                loading="lazy"
            />
        )
    }

    return <AssistantFileIcon mimeType={attachment.mimeType} />
}

function AssistantFileIcon({ mimeType }: { mimeType: string }) {
    const Icon = mimeType.startsWith("image/") ? ImageIcon : FileText

    return (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-ds-surface-interactive text-ds-fg-muted">
            <Icon className="size-4" />
        </span>
    )
}

function formatAssistantAttachmentDate(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Uploaded file"

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date)
}
