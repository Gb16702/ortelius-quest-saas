export function formatInvoiceNumber(timestampMs: number, randomId: string): string {
  const timestamp = timestampMs.toString(36).toUpperCase()
  return `INV-${timestamp}-${randomId.toUpperCase()}`
}
