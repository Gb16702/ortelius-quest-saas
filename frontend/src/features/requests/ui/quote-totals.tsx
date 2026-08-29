import type { QuoteData } from "../model/request"

interface QuoteTotalsProps {
    quoteData: QuoteData
}

interface TotalRow {
    label: string
    value: string
    isTotal?: boolean
}

export function QuoteTotals({ quoteData }: QuoteTotalsProps) {
    const totalRows: TotalRow[] = [
        {
            label: "Total (Excl. VAT)",
            value: `€ ${quoteData.totalHT.toFixed(2)}`,
        },
        {
            label: `VAT (${quoteData.vatRate}%)`,
            value: `€ ${quoteData.vatAmount.toFixed(2)}`,
        },
        {
            label: "Total",
            value: `€ ${quoteData.totalTTC.toFixed(2)}`,
            isTotal: true,
        },
    ]

    return (
        <div className="space-y-4 text-sm">
            {totalRows.map((row) => (
                <div
                    key={row.label}
                    className={`flex justify-between ${
                        row.isTotal ? "border-t pt-4 font-medium" : ""
                    }`}
                >
                    <span>{row.label}</span>
                    <span className={row.isTotal ? "text-ds-fg" : "text-ds-fg-muted"}>
                        {row.value}
                    </span>
                </div>
            ))}
        </div>
    )
}
