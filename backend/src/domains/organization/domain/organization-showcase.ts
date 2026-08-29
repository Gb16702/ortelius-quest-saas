import type { OrganizationFont } from './organization-font'

export type OrganizationShowcaseData = {
  organization: {
    id: string
    name: string
    slug: string | null
    logo: string | null
    tagline: string | null
    overview: string | null
    website: string | null
    brandColor: string | null
    font: OrganizationFont
    createdAt: Date
    memberCount: number
  }
  stats: {
    profileViews: number
    requestsHandled: number
    responseRate: number
  }
  services: unknown[]
  cargoTypes: unknown[]
}
