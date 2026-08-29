import { type BrandColor, DEFAULT_BRAND_COLOR, isBrandColor } from './brand-color'

export interface OrganizationOgPalette {
  from: string
  to: string
}

const BRAND_OG_PALETTE: Record<BrandColor, OrganizationOgPalette> = {
  '#0103B8': { from: '#0103B8', to: '#04006e' },
  '#CC7D5E': { from: '#CC7D5E', to: '#7e4634' },
  '#5E6AD2': { from: '#5E6AD2', to: '#303980' },
  '#3183D8': { from: '#3183D8', to: '#164a82' },
  '#3D755D': { from: '#3D755D', to: '#223f33' },
  '#FF66AD': { from: '#FF66AD', to: '#a12d67' },
  '#333333': { from: '#4a4a4a', to: '#1f1f1f' },
}

export function getOrganizationOgPalette(
  brandColor: string | null | undefined
): OrganizationOgPalette {
  return BRAND_OG_PALETTE[isBrandColor(brandColor) ? brandColor : DEFAULT_BRAND_COLOR]
}
