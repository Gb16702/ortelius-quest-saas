import { createElement } from 'react'
import type { OrganizationOgPalette } from '../domain/organization-og'

interface OrganizationOgCardProps {
  name: string
  palette: OrganizationOgPalette
}

const NAME_FONT_SIZES = [
  { maxLength: 30, fontSize: 100 },
  { maxLength: 45, fontSize: 80 },
  { maxLength: 60, fontSize: 64 },
] as const

const FALLBACK_FONT_SIZE = 48

function pickFontSize(length: number): number {
  for (const tier of NAME_FONT_SIZES) {
    if (length <= tier.maxLength) return tier.fontSize
  }

  return FALLBACK_FONT_SIZE
}

export function OrganizationOgCard({ name, palette }: OrganizationOgCardProps) {
  const fontSize = pickFontSize(name.length)

  return createElement(
    'div',
    {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundImage: `linear-gradient(180deg, ${palette.from} 0%, ${palette.to} 100%)`,
        paddingBottom: 120,
      },
    },
    createElement(
      'div',
      {
        style: {
          color: '#ffffff',
          fontFamily: 'Geist',
          fontWeight: 700,
          fontSize,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
          paddingLeft: 80,
          paddingRight: 80,
          marginBottom: 48,
        },
      },
      name
    ),
    createElement('div', {
      style: {
        width: 1200,
        height: 1,
        backgroundColor: '#ffffff',
      },
    })
  )
}
