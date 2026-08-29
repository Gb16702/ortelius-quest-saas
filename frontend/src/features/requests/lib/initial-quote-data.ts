import type {
    CargoDetails,
    CargoDetailsDimensions,
    CargoDetailsOptions,
    Category,
    QuoteData,
    SelectedService,
    Service,
} from "../model/request"
import { calculateQuoteTotals } from "./quote-totals"
import { getQuoteVatRateByTaxType } from "./quote-vat-rates"

function createInitialServices(services: Service[]): SelectedService[] {
    return services.map((service) => ({
        serviceId: service.id,
        included: true,
        price: 0,
    }))
}

interface CargoDetailsInput {
    weight?: number | null
    volume?: number | null
    palletCount?: number | null
    fragility?: string | null
    dimensions?: Partial<CargoDetailsDimensions>
    options?: Partial<CargoDetailsOptions>
}

function createInitialCargoDetails(cargoDetails?: CargoDetailsInput): CargoDetails {
    return {
        weight: cargoDetails?.weight ?? null,
        volume: cargoDetails?.volume ?? null,
        palletCount: cargoDetails?.palletCount ?? null,
        fragility: cargoDetails?.fragility ?? null,
        dimensions: {
            length: cargoDetails?.dimensions?.length ?? null,
            width: cargoDetails?.dimensions?.width ?? null,
            height: cargoDetails?.dimensions?.height ?? null,
        },
        options: {
            hazardous: cargoDetails?.options?.hazardous ?? false,
            insuranceCoverage: cargoDetails?.options?.insuranceCoverage ?? false,
            perishableGoods: cargoDetails?.options?.perishableGoods ?? false,
        },
    }
}

export function createInitialQuoteData(requestData: {
    services: Service[]
    categories: Category[]
    cargoDetails?: CargoDetailsInput
    organization?: { taxIdType?: string | null }
}): QuoteData {
    const vatRate = getQuoteVatRateByTaxType(requestData.organization?.taxIdType)
    const initialServices = createInitialServices(requestData.services)
    const initialTotals = calculateQuoteTotals(initialServices, vatRate)

    return {
        selectedCategories: requestData.categories.map((cat) => cat.id),
        selectedServices: initialServices,
        cargoDetails: createInitialCargoDetails(requestData.cargoDetails),
        description: "",
        vatRate,
        ...initialTotals,
        legalDocumentIds: [],
    }
}
