import type React from "react"
import { useCallback, useRef, useState } from "react"
import ReactCrop, {
    type Crop,
    centerCrop,
    convertToPixelCrop,
    makeAspectCrop,
    type PixelCrop,
} from "react-image-crop"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"
import "react-image-crop/dist/ReactCrop.css"

interface ImageCropperContentProps {
    imageSrc: string
    onSave: (croppedImageFile: File) => void
    onCancel: () => void
    isUploading?: boolean
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: "%",
                width: 100,
            },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    )
}

const AVATAR_CONFIG = {
    aspect: 1,
    circular: true,
    title: "Set Avatar",
    filename: "avatar.png",
    outputWidth: 400,
    outputHeight: 400,
    containerMaxHeight: 400,
    containerMaxWidth: 500,
} as const

export function ImageCropperContent({
    imageSrc,
    onSave,
    onCancel,
    isUploading = false,
}: ImageCropperContentProps) {
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const imgRef = useRef<HTMLImageElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget
        setCrop(centerAspectCrop(width, height, AVATAR_CONFIG.aspect))
    }, [])

    const resetCrop = useCallback(() => {
        if (imgRef.current) {
            const { width, height } = imgRef.current
            setCrop(centerAspectCrop(width, height, AVATAR_CONFIG.aspect))
        }
    }, [])

    const getCroppedImg = useCallback(async (): Promise<File | null> => {
        const image = imgRef.current
        const canvas = canvasRef.current

        if (!image || !canvas || !completedCrop) {
            return null
        }

        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height
        const ctx = canvas.getContext("2d")

        if (!ctx) {
            return null
        }

        canvas.width = AVATAR_CONFIG.outputWidth
        canvas.height = AVATAR_CONFIG.outputHeight

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.filter = "contrast(1.05) saturate(1.02)"

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            AVATAR_CONFIG.outputWidth,
            AVATAR_CONFIG.outputHeight
        )

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(null)
                    return
                }
                const file = new File([blob], AVATAR_CONFIG.filename, { type: "image/png" })
                resolve(file)
            }, "image/png")
        })
    }, [completedCrop])

    const saveCroppedImage = useCallback(async () => {
        const croppedImageFile = await getCroppedImg()
        if (croppedImageFile) {
            onSave(croppedImageFile)
        }
    }, [getCroppedImg, onSave])

    return (
        <>
            <div className="flex min-h-[200px] flex-1 items-center justify-center overflow-auto px-8 py-6">
                <div className="flex items-center justify-center rounded-md bg-ds-surface-interactive p-4">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) =>
                            setCompletedCrop(
                                convertToPixelCrop(
                                    c,
                                    imgRef.current?.width || 0,
                                    imgRef.current?.height || 0
                                )
                            )
                        }
                        aspect={AVATAR_CONFIG.aspect}
                        circularCrop={AVATAR_CONFIG.circular}
                    >
                        <img
                            ref={imgRef}
                            alt="Crop me"
                            src={imageSrc}
                            style={{
                                maxHeight: AVATAR_CONFIG.containerMaxHeight,
                                maxWidth: AVATAR_CONFIG.containerMaxWidth,
                                display: "block",
                            }}
                            onLoad={onImageLoad}
                        />
                    </ReactCrop>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-ds-surface-border border-t bg-ds-canvas px-8 py-3">
                <Button
                    size="lg"
                    radius="full"
                    variant="outline"
                    onClick={resetCrop}
                    disabled={isUploading}
                >
                    Reset
                </Button>
                <div className="flex gap-3">
                    <Button
                        size="lg"
                        radius="full"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isUploading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="solid"
                        size="lg"
                        radius="full"
                        onClick={saveCroppedImage}
                        disabled={!completedCrop || isUploading}
                    >
                        {isUploading ? <Spinner className="mr-2" /> : null}
                        {isUploading ? "Uploading..." : AVATAR_CONFIG.title}
                    </Button>
                </div>
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />
        </>
    )
}
