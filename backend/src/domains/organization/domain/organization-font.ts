export const ORGANIZATION_FONT_IDS = [
  'geist',
  'inter',
  'roboto',
  'ibm-plex-sans',
  'manrope',
  'plus-jakarta-sans',
] as const

export type OrganizationFont = (typeof ORGANIZATION_FONT_IDS)[number]

export const DEFAULT_ORGANIZATION_FONT: OrganizationFont = 'geist'

const organizationFonts = new Set<string>(ORGANIZATION_FONT_IDS)

export function isOrganizationFont(value: unknown): value is OrganizationFont {
  return typeof value === 'string' && organizationFonts.has(value)
}

export function normalizeOrganizationFont(value: unknown): OrganizationFont {
  return isOrganizationFont(value) ? value : DEFAULT_ORGANIZATION_FONT
}
