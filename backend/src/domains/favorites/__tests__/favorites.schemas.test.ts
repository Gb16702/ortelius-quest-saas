import { describe, expect, it } from 'bun:test'
import {
  favoriteEntityTypeSchema,
  favoritesQuerySchema,
  favoriteToggleSchema,
} from '../presentation/favorites.schemas'

describe('favorite schemas', () => {
  it('accepts persisted object favorites and conversation favorites', () => {
    expect(favoriteEntityTypeSchema.safeParse('request').success).toBe(true)
    expect(favoriteEntityTypeSchema.safeParse('quote').success).toBe(true)
    expect(favoriteEntityTypeSchema.safeParse('invoice').success).toBe(true)
    expect(favoriteEntityTypeSchema.safeParse('conversation').success).toBe(true)
    expect(favoriteEntityTypeSchema.safeParse('member').success).toBe(true)
    expect(favoriteEntityTypeSchema.safeParse('assistant_conversation').success).toBe(true)
  })

  it('rejects invalid favorite toggles', () => {
    expect(
      favoriteToggleSchema.safeParse({ entityType: 'request', entityId: 'request-1' }).success
    ).toBe(true)
    expect(
      favoriteToggleSchema.safeParse({ entityType: 'member', entityId: 'user-1' }).success
    ).toBe(true)
    expect(
      favoriteToggleSchema.safeParse({
        entityType: 'assistant_conversation',
        entityId: 'assistant-conversation-1',
      }).success
    ).toBe(true)
    expect(favoriteToggleSchema.safeParse({ entityType: 'request', entityId: '' }).success).toBe(
      false
    )
    expect(
      favoriteToggleSchema.safeParse({ entityType: 'service', entityId: 'service-1' }).success
    ).toBe(false)
  })

  it('keeps organization filtering optional', () => {
    expect(favoritesQuerySchema.safeParse({}).success).toBe(true)
    expect(favoritesQuerySchema.safeParse({ organizationId: 'org-1' }).success).toBe(true)
  })
})
