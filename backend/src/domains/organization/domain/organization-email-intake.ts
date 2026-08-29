export type OrganizationEmailIntakeResult = {
  success: boolean
  emailAddress: string | null
}

export function buildInboundEmailAddress(slug: string, enabled: boolean): string | null {
  return enabled ? `${slug}@inbound.ortelius.app` : null
}
