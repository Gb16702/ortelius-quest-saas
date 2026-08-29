export const DEFAULT_BRAND_COLOR = '#0103B8'

export const BRAND_COLORS = [
  { id: '#0103B8', label: 'Quest Blue' },
  { id: '#CC7D5E', label: 'Copper Clay' },
  { id: '#5E6AD2', label: 'Cosmic Iris' },
  { id: '#3183D8', label: 'Signal Azure' },
  { id: '#3D755D', label: 'Pine Harbor' },
  { id: '#FF66AD', label: 'Neon Bloom' },
  { id: '#333333', label: 'Graphite' },
] as const

export type BrandColor = (typeof BRAND_COLORS)[number]['id']

export const BRAND_COLOR_VALUES = BRAND_COLORS.map((color) => color.id) as [
  BrandColor,
  ...BrandColor[],
]

export function isBrandColor(value: string | null | undefined): value is BrandColor {
  return BRAND_COLOR_VALUES.includes(value as BrandColor)
}

export function normalizeBrandColor(value: string | null | undefined): BrandColor {
  return isBrandColor(value) ? value : DEFAULT_BRAND_COLOR
}

export function getBrandColorHex(value: string | null | undefined): BrandColor {
  return normalizeBrandColor(value)
}
