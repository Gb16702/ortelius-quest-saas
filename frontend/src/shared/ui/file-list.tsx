import { FileText, X } from "lucide-react"
import { formatFileSize } from "@/shared/lib/file-size"
import { Button } from "@/shared/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface FileItem {
    name: string
    size: number
    type?: string
}

interface FileListProps {
    files: File[] | FileItem[]
    onRemoveFile?: (index: number) => void
    onItemClick?: (index: number) => void
    showDeleteButton?: boolean
}

export const FileList = ({
    files,
    onRemoveFile,
    onItemClick,
    showDeleteButton = true,
}: FileListProps) => {
    if (!files || files.length === 0) {
        return null
    }

    return files.map((file, index) => (
        <FileListItem
            key={`${file.name}-${file.size}-${index}`}
            file={file}
            index={index}
            onRemove={onRemoveFile}
            onItemClick={onItemClick}
            showDeleteButton={showDeleteButton}
        />
    ))
}

interface FileListItemProps {
    file: File | FileItem
    index: number
    onRemove?: (index: number) => void
    onItemClick?: (index: number) => void
    showDeleteButton: boolean
}

const FileListItem = ({
    file,
    index,
    onRemove,
    onItemClick,
    showDeleteButton,
}: FileListItemProps) => {
    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: contains a nested <Button> for remove; converting outer to <button> would nest button-in-button
        <div
            className={`group relative flex h-[64px] min-w-[250px] items-center rounded-sm border border-ds-surface-border bg-ds-surface px-4 ${onItemClick ? "cursor-pointer transition-colors hover:border-ds-gray-400 hover:bg-ds-surface-hover" : ""}`}
            onClick={onItemClick ? () => onItemClick(index) : undefined}
            onKeyDown={
                onItemClick
                    ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              onItemClick(index)
                          }
                      }
                    : undefined
            }
            role={onItemClick ? "button" : undefined}
            tabIndex={onItemClick ? 0 : undefined}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex-shrink-0 rounded-sm py-2">
                    <FileText className="size-5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                    <p
                        className={`truncate font-medium text-ds-fg text-sm ${onItemClick ? "underline decoration-ds-fg-subtle transition-colors hover:decoration-ds-fg" : ""}`}
                    >
                        {file.name}
                    </p>
                    <p className="text-ds-fg-muted text-xs">{formatFileSize(file.size)}</p>
                </div>
            </div>
            {showDeleteButton && onRemove && (
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
                        <p>Remove attachment</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    )
}
