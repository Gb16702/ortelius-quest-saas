export const CARD_BRAND_LABELS: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
    unknown: "Card",
}

export function brandNeedsBorder(brand: string): boolean {
    const normalized = brand.toLowerCase()
    return normalized === "visa" || normalized === "discover"
}
