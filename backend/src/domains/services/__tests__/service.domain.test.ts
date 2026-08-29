import { describe, expect, it } from 'bun:test'
import type { Service } from '../application/service-models'
import { sortByName } from '../domain'

function makeService(name: string): Service {
  return {
    id: name.toLowerCase(),
    name,
    slug: name.toLowerCase(),
    type: 'cargo',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  }
}

describe('Service domain', () => {
  it('sorts services alphabetically by name without mutating the input', () => {
    const services = [
      makeService('Zebra Logistics'),
      makeService('alpha Cargo'),
      makeService('Beta Storage'),
    ]

    const sorted = sortByName(services)

    expect(sorted.map((service) => service.name)).toEqual([
      'alpha Cargo',
      'Beta Storage',
      'Zebra Logistics',
    ])
    expect(services.map((service) => service.name)).toEqual([
      'Zebra Logistics',
      'alpha Cargo',
      'Beta Storage',
    ])
  })

  it('handles empty and single-item lists', () => {
    const single = [makeService('Single Service')]

    expect(sortByName([])).toEqual([])
    expect(sortByName(single)).toEqual(single)
  })
})
