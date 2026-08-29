import type { OrganizationFont } from './organization-font'

export type OrganizationProfile = {
  id: string
  name: string
  slug: string | null
  logo?: string | null
  brandLogo?: string | null
  tagline?: string | null
  overview?: string | null
  website?: string | null
  metadata?: string | null
  brandColor?: string
  font: OrganizationFont
  createdAt: Date
}

export type OrganizationInfo = OrganizationProfile & {
  taxIdType?: string | null
  taxIdNumber?: string | null
  emailIntakeEnabled?: boolean
}
