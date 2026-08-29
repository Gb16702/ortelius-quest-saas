import { describe, expect, it } from 'bun:test'
import type { Category } from '../application/category-models'
import { sortByName } from '../domain'

function makeCategory(name: string): Category {
  return {
    id: name.toLowerCase(),
    name,
    slug: name.toLowerCase(),
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  }
}

describe('Category domain', () => {
  it('sorts categories alphabetically by name without mutating the input', () => {
    const categories = [makeCategory('Zebra'), makeCategory('apple'), makeCategory('Banana')]

    const sorted = sortByName(categories)

    expect(sorted.map((category) => category.name)).toEqual(['apple', 'Banana', 'Zebra'])
    expect(categories.map((category) => category.name)).toEqual(['Zebra', 'apple', 'Banana'])
  })

  it('handles empty and single-item lists', () => {
    const single = [makeCategory('Single')]

    expect(sortByName([])).toEqual([])
    expect(sortByName(single)).toEqual(single)
  })
})
