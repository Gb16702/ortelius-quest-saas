import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const forbiddenInnerLayerImports = [
  'src/infrastructure',
  '../../infrastructure',
  '../../../infrastructure',
  'drizzle-orm',
  'stripe',
  'hono',
  'openai',
  '@aws-sdk',
]

const forbiddenRootCompatibilityFacades = [
  'src/domains/subscription/subscription.routes.ts',
  'src/domains/subscription/subscription-billing-access.service.ts',
  'src/domains/subscription/subscription-billing-account.service.ts',
  'src/domains/subscription/subscription-billing-address.service.ts',
  'src/domains/subscription/subscription-cancel.service.ts',
  'src/domains/subscription/subscription-change.service.ts',
  'src/domains/subscription/subscription-current.service.ts',
  'src/domains/subscription/subscription-invoice-email.service.ts',
  'src/domains/subscription/subscription-invoice-language.service.ts',
  'src/domains/subscription/subscription-payment-method.service.ts',
  'src/domains/subscription/subscription-seats.service.ts',
  'src/domains/subscription/subscription-subscribe.service.ts',
  'src/domains/subscription/stripe-webhook-handlers.service.ts',
]

const forbiddenInfrastructureImports = ['../../organization/organization-stripe-customer.service']

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return collectTypeScriptFiles(path)
    return path.endsWith('.ts') ? [path] : []
  })
}

describe('Subscription architecture', () => {
  it('keeps domain and application independent from infrastructure/framework adapters', () => {
    const files = [
      ...collectTypeScriptFiles('src/domains/subscription/domain'),
      ...collectTypeScriptFiles('src/domains/subscription/application'),
    ]

    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      for (const forbiddenImport of forbiddenInnerLayerImports) {
        const importPattern = new RegExp(`from ['"][^'"]*${forbiddenImport}[^'"]*['"]`)
        expect(importPattern.test(content), `${file} imports ${forbiddenImport}`).toBe(false)
      }
    }
  })

  it('keeps presentation behind the subscription application facade', () => {
    const files = collectTypeScriptFiles('src/domains/subscription/presentation')

    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      expect(
        /from ['"]\.\.\/subscription-[^'"]+\.service['"]/.test(content),
        `${file} imports a legacy subscription service facade`
      ).toBe(false)
    }
  })

  it('keeps the subscription application facade free of Stripe event types', () => {
    const content = readFileSync('src/domains/subscription/subscription.application.ts', 'utf8')

    expect(/from ['"]stripe['"]/.test(content), 'subscription.application imports stripe').toBe(
      false
    )
  })

  it('keeps removed root compatibility facades from coming back', () => {
    for (const file of forbiddenRootCompatibilityFacades) {
      expect(existsSync(file), `${file} should not exist`).toBe(false)
    }
  })

  it('keeps subscription infrastructure off removed organization root services', () => {
    const files = collectTypeScriptFiles('src/domains/subscription/infrastructure')

    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      for (const forbiddenImport of forbiddenInfrastructureImports) {
        expect(content.includes(forbiddenImport), `${file} imports ${forbiddenImport}`).toBe(false)
      }
    }
  })
})
