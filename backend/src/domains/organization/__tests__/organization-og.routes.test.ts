import { describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { createOrganizationOgRoutes } from '../presentation/organization-og.routes'

const PNG_1X1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])

const RENDERED_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
const FALLBACK_CACHE_CONTROL = 'public, max-age=60, must-revalidate'

function createApp(deps: Parameters<typeof createOrganizationOgRoutes>[0]) {
  const app = new Hono<{ Variables: CommonVariables }>()
  app.route('/og', createOrganizationOgRoutes(deps))

  return app
}

function createOrganization(overrides: { name?: string; brandColor?: string | null } = {}) {
  return {
    id: 'org-1',
    name: overrides.name ?? 'Acme Freight',
    slug: 'acme',
    logo: null,
    brandLogo: null,
    tagline: null,
    overview: null,
    website: null,
    metadata: null,
    brandColor: overrides.brandColor ?? '#FF66AD',
    createdAt: new Date('2026-05-17T00:00:00.000Z'),
  }
}

describe('organization OG routes', () => {
  it('returns a rendered PNG for a valid organization slug', async () => {
    const getOrganization = mock(async () => createOrganization())
    const renderImage = mock(async () => PNG_1X1)
    const response = await createApp({ getOrganization, renderImage }).request('/og/org/acme.png')

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Cache-Control')).toBe(RENDERED_CACHE_CONTROL)
    expect(Array.from(new Uint8Array(await response.arrayBuffer()).slice(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ])
    expect(getOrganization).toHaveBeenCalledWith('acme')
    expect(renderImage).toHaveBeenCalled()
  })

  it('returns not found when the organization slug does not exist', async () => {
    const response = await createApp({
      getOrganization: mock(async () => null),
      renderImage: mock(async () => PNG_1X1),
    }).request('/og/org/missing.png')

    expect(response.status).toBe(404)
  })

  it('requires the .png extension', async () => {
    const response = await createApp({
      getOrganization: mock(async () => createOrganization()),
      renderImage: mock(async () => PNG_1X1),
    }).request('/og/org/acme')

    expect(response.status).toBe(404)
  })

  it('returns the static fallback PNG when rendering fails', async () => {
    const originalConsoleError = console.error
    console.error = () => undefined

    try {
      const response = await createApp({
        getOrganization: mock(async () => createOrganization()),
        renderImage: mock(async () => {
          throw new Error('render failed')
        }),
      }).request('/og/org/acme.png')

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/png')
      expect(response.headers.get('Cache-Control')).toBe(FALLBACK_CACHE_CONTROL)
      expect(Array.from(new Uint8Array(await response.arrayBuffer()).slice(0, 8))).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ])
    } finally {
      console.error = originalConsoleError
    }
  })
})
