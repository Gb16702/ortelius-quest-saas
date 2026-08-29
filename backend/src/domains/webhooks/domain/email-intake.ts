export function extractOrgSlugFromInboundEmail(toEmail: string): string | null {
  const match = toEmail.match(/^([^@]+)@inbound\.ortelius\.app$/i)
  return match ? match[1].toLowerCase() : null
}

export function requestNumberFromDate(now: Date): string {
  return `REQ-${now.getTime()}`
}

export function defaultInboundRequestDates(now: Date): {
  fromDate: Date
  toDate: Date
} {
  return {
    fromDate: now,
    toDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  }
}
