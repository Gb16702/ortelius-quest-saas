import { describe, expect, it } from 'bun:test'
import { getOrganizationOgPalette } from '../domain/organization-og'
import { OrganizationOgCard } from '../presentation/organization-og-card'
import { renderPng } from '../presentation/organization-og-renderer'

function readPngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)

  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  }
}

describe('organization OG renderer', () => {
  it('renders a 1200x630 PNG image', async () => {
    const png = await renderPng({
      node: OrganizationOgCard({
        name: 'Acme Freight',
        palette: getOrganizationOgPalette('rose'),
      }),
      width: 1200,
      height: 630,
    })

    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(readPngSize(png)).toEqual({ width: 1200, height: 630 })
  })
})
