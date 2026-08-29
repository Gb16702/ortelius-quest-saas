export const plansKeys = {
    all: ["plans"] as const,
}

export const subscriptionKeys = {
    all: ["subscription"] as const,
    scope: (organizationId: string | null | undefined) =>
        [...subscriptionKeys.all, organizationId ?? null] as const,
    current: (organizationId: string | null | undefined) =>
        [...subscriptionKeys.scope(organizationId), "current"] as const,
    paymentMethod: (organizationId: string | null | undefined) =>
        [...subscriptionKeys.scope(organizationId), "payment-method"] as const,
    billingAddress: (organizationId: string | null | undefined) =>
        [...subscriptionKeys.scope(organizationId), "billing-address"] as const,
    invoiceEmail: (organizationId: string | null | undefined) =>
        [...subscriptionKeys.scope(organizationId), "invoice-email"] as const,
    invoiceLanguage: (organizationId: string | null | undefined) =>
        [...subscriptionKeys.scope(organizationId), "invoice-language"] as const,
}
