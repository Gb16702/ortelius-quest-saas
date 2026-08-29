import { preloadableLazy } from "@/shared/lib/performance/preloadable-lazy"

export const LazyImageCropperContent = preloadableLazy(() =>
    import("./image-cropper-content").then((module) => ({
        default: module.ImageCropperContent,
    }))
)
