import { Suspense } from "react"
import { LazyImageCropperContent } from "@/shared/ui/image-cropper-lazy-content"
import { Skeleton } from "@/shared/ui/skeleton"

interface ImageCropperProps {
    imageSrc: string
    onSave: (croppedImageFile: File) => void
    onCancel: () => void
    isUploading?: boolean
}

export function ImageCropper(props: ImageCropperProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ds-canvas/[.5]">
            <div className="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-md bg-ds-surface shadow-modal">
                <Suspense fallback={<ImageCropperSkeleton />}>
                    <LazyImageCropperContent {...props} />
                </Suspense>
            </div>
        </div>
    )
}

function ImageCropperSkeleton() {
    return (
        <>
            <div className="flex min-h-[420px] flex-1 items-center justify-center overflow-hidden px-8 py-6">
                <Skeleton className="h-[360px] w-full max-w-[500px] rounded-md" />
            </div>
            <div className="flex items-center justify-between gap-3 border-ds-surface-border border-t bg-ds-canvas px-8 py-3">
                <Skeleton className="h-10 w-24 rounded-full" />
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-24 rounded-full" />
                    <Skeleton className="h-10 w-28 rounded-full" />
                </div>
            </div>
        </>
    )
}
