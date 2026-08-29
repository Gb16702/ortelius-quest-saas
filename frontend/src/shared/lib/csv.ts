const DANGEROUS_SPREADSHEET_PREFIXES = ["=", "+", "-", "@", "\t", "\r", "\n"]

export function serializeCsvCell(value: unknown) {
    if (value === null || value === undefined) {
        return ""
    }

    const stringValue = String(value)
    const spreadsheetSafeValue = DANGEROUS_SPREADSHEET_PREFIXES.some((prefix) =>
        stringValue.startsWith(prefix)
    )
        ? `'${stringValue}`
        : stringValue

    if (
        spreadsheetSafeValue.includes(",") ||
        spreadsheetSafeValue.includes('"') ||
        spreadsheetSafeValue.includes("\n") ||
        spreadsheetSafeValue.includes("\r")
    ) {
        return `"${spreadsheetSafeValue.replace(/"/g, '""')}"`
    }

    return spreadsheetSafeValue
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
    if (!data || data.length === 0) {
        return
    }

    const headers = Object.keys(data[0])

    const csvContent = [
        headers.map(serializeCsvCell).join(","),
        ...data.map((row) => headers.map((header) => serializeCsvCell(row[header])).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", filename)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }
}
