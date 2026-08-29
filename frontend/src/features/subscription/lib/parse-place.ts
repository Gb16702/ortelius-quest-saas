import type { BillingAddressFormData } from "../model/schemas/billing-address.schema"

type AddressComponent = google.maps.places.AddressComponent

function findComponent(components: AddressComponent[], type: string): string | null {
    return components.find((c) => c.types.includes(type))?.longText ?? null
}

function findComponentShort(components: AddressComponent[], type: string): string | null {
    return components.find((c) => c.types.includes(type))?.shortText ?? null
}

export function parsePlace(place: google.maps.places.Place): Partial<BillingAddressFormData> {
    const components = place.addressComponents ?? []

    const streetNumber = findComponent(components, "street_number")
    const route = findComponent(components, "route")
    const line1 = [streetNumber, route].filter(Boolean).join(" ").trim()

    const city =
        findComponent(components, "locality") ??
        findComponent(components, "postal_town") ??
        findComponent(components, "administrative_area_level_2") ??
        ""

    const postalCode = findComponent(components, "postal_code") ?? ""
    const state = findComponent(components, "administrative_area_level_1") ?? undefined
    const country = findComponentShort(components, "country") ?? ""

    return {
        line1: line1 || place.displayName || place.formattedAddress || "",
        city,
        postalCode,
        state,
        country,
    }
}
