interface OrganizationPublishableInput {
    tagline: string | null
    overview: string | null
    servicesCount: number
    cargoTypesCount: number
}

export function isOrganizationPublishable(input: OrganizationPublishableInput): boolean {
    const hasNarrative = Boolean(input.tagline?.trim() || input.overview?.trim())
    const hasOffering = input.servicesCount > 0 || input.cargoTypesCount > 0
    return hasNarrative && hasOffering
}
