import type { BillingAddressFormData } from "../model/schemas/billing-address.schema"
import type { BillingAddress, UpdateBillingAddressInput } from "../model/subscription"

type BillingAddressFormField = keyof BillingAddressFormData

export function createBillingAddressFormValues(
    currentAddress: BillingAddress | null
): BillingAddressFormData {
    return {
        country: currentAddress?.country ?? "",
        line1: currentAddress?.line1 ?? "",
        line2: currentAddress?.line2 ?? "",
        postalCode: currentAddress?.postalCode ?? "",
        city: currentAddress?.city ?? "",
        state: currentAddress?.state ?? "",
    }
}

export function toUpdateBillingAddressInput(
    formData: BillingAddressFormData
): UpdateBillingAddressInput {
    return {
        address: {
            country: formData.country,
            line1: formData.line1,
            line2: formData.line2?.trim() ? formData.line2 : null,
            city: formData.city,
            postalCode: formData.postalCode,
            state: formData.state?.trim() ? formData.state : null,
        },
    }
}

export function getBillingAddressPlaceEntries(
    place: Partial<BillingAddressFormData>
): Array<{ field: BillingAddressFormField; value: string }> {
    const entries: Array<{ field: BillingAddressFormField; value: string }> = []

    for (const field of ["country", "line1", "postalCode", "city", "state"] as const) {
        const value = place[field]
        if (value) entries.push({ field, value })
    }

    return entries
}
