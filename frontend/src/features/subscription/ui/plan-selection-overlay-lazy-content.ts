import { preloadableLazy } from "@/shared/lib/performance/preloadable-lazy"

export const LazyPlanSelectionOverlayContent = preloadableLazy(() =>
    import("./plan-selection-overlay-content").then((module) => ({
        default: module.PlanSelectionOverlayContent,
    }))
)
