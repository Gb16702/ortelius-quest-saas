import { type HTMLAttributes, useState } from "react"
import { type DropzoneOptions, useDropzone } from "react-dropzone"
import { cn } from "@/shared/lib/class-names"

export const DROPZONE_PRESETS = {
    images: {
        accept: {
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/webp": [".webp"],
        },
        maxSize: 5 * 1024 * 1024,
    },
    documents: {
        accept: {
            "application/pdf": [".pdf"],
            "application/msword": [".doc"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "text/plain": [".txt"],
        },
        maxSize: 10 * 1024 * 1024,
    },
    media: {
        accept: {
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/webp": [".webp"],
            "video/mp4": [".mp4"],
            "video/webm": [".webm"],
        },
        maxSize: 50 * 1024 * 1024,
    },
    archives: {
        accept: {
            "application/zip": [".zip"],
            "application/x-7z-compressed": [".7z"],
        },
        maxSize: 100 * 1024 * 1024,
    },
} as const

export type DropzonePreset = keyof typeof DROPZONE_PRESETS

interface DropzoneProps extends Omit<HTMLAttributes<HTMLDivElement>, "onDrop"> {
    onDrop: DropzoneOptions["onDrop"]
    preset?: DropzonePreset
    accept?: DropzoneOptions["accept"]
    maxSize?: DropzoneOptions["maxSize"]
    maxFiles?: DropzoneOptions["maxFiles"]
    disabled?: boolean
    showFiles?: boolean
    title?: string
    description?: string
    activeDescription?: string
    onFileSelect?: (file: File) => void
}

export function Dropzone({
    onDrop,
    preset,
    accept,
    maxSize,
    maxFiles = 1,
    disabled,
    showFiles = true,
    title = "Upload files",
    description,
    activeDescription = "Drop the files here",
    onFileSelect,
    className,
    ...props
}: DropzoneProps) {
    const [isFileDialogActive, setIsFileDialogActive] = useState(false)

    const config = preset ? DROPZONE_PRESETS[preset] : null
    const allowedTypes = accept || config?.accept
    const sizeLimit = maxSize || config?.maxSize

    const onDropFiles: DropzoneOptions["onDrop"] = (acceptedFiles, fileRejections, event) => {
        onDrop?.(acceptedFiles, fileRejections, event)

        if (onFileSelect && acceptedFiles.length > 0) {
            onFileSelect(acceptedFiles[0])
        }

        setIsFileDialogActive(false)
    }

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop: onDropFiles,
        onFileDialogOpen: () => setIsFileDialogActive(true),
        onFileDialogCancel: () => setIsFileDialogActive(false),
        accept: allowedTypes,
        maxSize: sizeLimit,
        maxFiles,
        disabled,
    })

    return (
        <div className={cn("w-full", className)} {...props}>
            <div
                {...getRootProps()}
                className={cn(
                    "relative cursor-pointer rounded-sm border border-ds-surface-border bg-ds-surface p-8 text-center transition-colors",
                    isDragActive && "border-ds-accent-700 bg-ds-accent-700/5",
                    isFileDialogActive && "border-ds-accent-700 bg-ds-accent-700/5",
                    isDragReject && "border-ds-danger-border bg-ds-danger-soft",
                    disabled && "cursor-not-allowed opacity-60"
                )}
            >
                <input {...getInputProps()} />
                <p className="mt-4 font-semibold text-ds-fg text-sm">{title}</p>
                <p className="mt-1 text-ds-fg-muted text-sm">
                    {isDragActive
                        ? activeDescription
                        : description || "Click here or drag and drop to upload"}
                </p>
            </div>
        </div>
    )
}
