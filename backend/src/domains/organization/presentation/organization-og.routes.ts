import { Hono } from 'hono'
import type { CommonVariables } from '../../../infrastructure/types/api.types'
import { getOrganizationOgPalette } from '../domain/organization-og'
import { organizationApplicationService } from '../organization.application'
import { FALLBACK_PNG_BASE64 } from './og-assets/fallback-png-base64'
import { OrganizationOgCard } from './organization-og-card'
import { renderPng } from './organization-og-renderer'

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
const RENDERED_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
const FALLBACK_CACHE_CONTROL = 'public, max-age=60, must-revalidate'
const PNG_CONTENT_TYPE = 'image/png'
const PNG_EXTENSION = '.png'

const PNG_1X1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])

let fallbackBuffer: Uint8Array | null = null

interface OrganizationOgRouteDependencies {
  getOrganization?: typeof organizationApplicationService.getBySlug
  renderImage?: typeof renderPng
}

function extractSlug(file: string | undefined): string | null {
  if (!file?.endsWith(PNG_EXTENSION)) return null

  const slug = file.slice(0, -PNG_EXTENSION.length)
  if (!slug || slug.includes('/')) return null

  return slug
}

function pngResponse(png: Uint8Array, cacheControl: string): Response {
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': PNG_CONTENT_TYPE,
      'Cache-Control': cacheControl,
    },
  })
}

function loadFallbackPng(): Uint8Array {
  if (!fallbackBuffer) {
    const binary = atob(FALLBACK_PNG_BASE64)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    fallbackBuffer = bytes
  }

  return fallbackBuffer
}

function fallbackResponse(): Response {
  return pngResponse(loadFallbackPng(), FALLBACK_CACHE_CONTROL)
}

function emptyPlaceholder(): Response {
  return pngResponse(PNG_1X1, FALLBACK_CACHE_CONTROL)
}

export function createOrganizationOgRoutes(deps: OrganizationOgRouteDependencies = {}) {
  const routes = new Hono<{ Variables: CommonVariables }>()
  const getOrganization =
    deps.getOrganization ??
    organizationApplicationService.getBySlug.bind(organizationApplicationService)
  const renderImage = deps.renderImage ?? renderPng

  routes.get('/org/:file', async (c) => {
    const slug = extractSlug(c.req.param('file'))
    if (!slug) return c.text('Not found', 404)

    try {
      const organization = await getOrganization(slug)
      if (!organization) return c.text('Not found', 404)

      try {
        const png = await renderImage({
          node: OrganizationOgCard({
            name: organization.name,
            palette: getOrganizationOgPalette(organization.brandColor),
          }),
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
        })

        return pngResponse(png, RENDERED_CACHE_CONTROL)
      } catch (renderError) {
        console.error('[og/org] render failed for slug', slug, renderError)

        try {
          return fallbackResponse()
        } catch (fallbackError) {
          console.error('[og/org] fallback decode failed for slug', slug, fallbackError)
          return emptyPlaceholder()
        }
      }
    } catch (error) {
      console.error('[og/org] route failed for slug', slug, error)
      return emptyPlaceholder()
    }
  })

  return routes
}

export default createOrganizationOgRoutes()
