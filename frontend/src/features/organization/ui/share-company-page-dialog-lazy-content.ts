import { preloadableLazy } from "@/shared/lib/performance/preloadable-lazy"

export const LazyShareCompanyPageDialogContent = preloadableLazy(() =>
    import("./share-company-page-dialog-content").then((module) => ({
        default: module.ShareCompanyPageDialogContent,
    }))
)
