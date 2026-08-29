import type { CargoDetails, RequestLifecycleStatus } from "../model/request"

const QUOTE_VIEW_STATUSES = new Set<RequestLifecycleStatus>(["quoted", "invoiced", "closed"])

export function shouldShowQuoteView(
    lifecycleStatus: RequestLifecycleStatus,
    isEditMode: boolean
): boolean {
    return !isEditMode && QUOTE_VIEW_STATUSES.has(lifecycleStatus)
}

export function hasCargoDetails(cargoDetails: CargoDetails): boolean {
    return Boolean(
        cargoDetails.weight ||
            cargoDetails.volume ||
            cargoDetails.palletCount ||
            cargoDetails.fragility ||
            cargoDetails.dimensions?.length ||
            cargoDetails.dimensions?.width ||
            cargoDetails.dimensions?.height ||
            cargoDetails.options?.hazardous ||
            cargoDetails.options?.insuranceCoverage ||
            cargoDetails.options?.perishableGoods
    )
}
