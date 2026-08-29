export const pricingIntelligenceKeys = {
    all: ["pricing-intelligence"] as const,
    stats: (organizationId: string | null | undefined) =>
        [...pricingIntelligenceKeys.all, "stats", organizationId ?? null] as const,
    imports: (organizationId: string | null | undefined) =>
        [...pricingIntelligenceKeys.all, "imports", organizationId ?? null] as const,
}
