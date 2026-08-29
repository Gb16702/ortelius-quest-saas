export function formatCurrency(
    amount: number,
    currency: string = "EUR",
    decimals: number = 2
): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount)
}
