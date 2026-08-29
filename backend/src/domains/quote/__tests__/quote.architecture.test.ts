import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const layerRoots = [
  join(process.cwd(), 'src/domains/quote/domain'),
  join(process.cwd(), 'src/domains/quote/application'),
].filter((path) => existsSync(path))

const presentationRoot = join(process.cwd(), 'src/domains/quote/presentation')
const quoteRepositoryAdapterPath = join(
  process.cwd(),
  'src/domains/quote/infrastructure/quote.repository.ts'
)

const forbiddenRootCompatibilityFacades = [
  'src/domains/quote/quote.routes.ts',
  'src/domains/quote/quote.middleware.ts',
  'src/domains/quote/quote.schemas.ts',
  'src/domains/quote/quote.services.ts',
  'src/domains/quote/quote.types.ts',
]

const forbiddenLegacyInfrastructureFiles = ['src/domains/quote/infrastructure/quote.service.ts']

const forbiddenImports = [
  'hono',
  'drizzle-orm',
  'stripe',
  'openai',
  '@aws-sdk/',
  '../../infrastructure',
  '../../../infrastructure',
]

const forbiddenPresentationImports = [
  'drizzle-orm',
  '/database',
  'db/schemas',
  'organization.services',
  'activity.application',
  'requests.application',
]

const forbiddenRepositorySideEffectImports = [
  'email.service',
  'notifications.services',
  'message.services',
  'organization.services',
  'invoice.services',
  'metrics.services',
  'pricing-intelligence',
]

function collectTsFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      files.push(...collectTsFiles(path))
    } else if (path.endsWith('.ts')) {
      files.push(path)
    }
  }
  return files
}

function collectImportSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const importPattern = /(?:from\s+|import\(\s*)['"]([^'"]+)['"]/g
  let match = importPattern.exec(source)
  while (match) {
    specifiers.push(match[1])
    match = importPattern.exec(source)
  }
  return specifiers
}

describe('Quote architecture', () => {
  it('keeps domain and application independent from infrastructure/framework adapters', () => {
    const violations = layerRoots.flatMap((root) =>
      collectTsFiles(root).flatMap((file) => {
        const imports = collectImportSpecifiers(readFileSync(file, 'utf8'))
        return imports
          .filter((specifier) =>
            forbiddenImports.some((forbidden) => specifier.includes(forbidden))
          )
          .map((specifier) => `${relative(process.cwd(), file)} imports ${specifier}`)
      })
    )

    expect(violations).toEqual([])
  })

  it('keeps presentation adapters free of direct persistence and cross-domain services', () => {
    const violations = collectTsFiles(presentationRoot).flatMap((file) => {
      const imports = collectImportSpecifiers(readFileSync(file, 'utf8'))
      return imports
        .filter((specifier) =>
          forbiddenPresentationImports.some((forbidden) => specifier.includes(forbidden))
        )
        .map((specifier) => `${relative(process.cwd(), file)} imports ${specifier}`)
    })

    expect(violations).toEqual([])
  })

  it('keeps the quote repository adapter free of lifecycle side-effect services', () => {
    const imports = collectImportSpecifiers(readFileSync(quoteRepositoryAdapterPath, 'utf8'))
    const violations = imports.filter((specifier) =>
      forbiddenRepositorySideEffectImports.some((forbidden) => specifier.includes(forbidden))
    )

    expect(violations).toEqual([])
  })

  it('keeps removed root compatibility facades from coming back', () => {
    for (const file of forbiddenRootCompatibilityFacades) {
      expect(existsSync(file), `${file} should not exist`).toBe(false)
    }
  })

  it('keeps renamed legacy infrastructure service files from coming back', () => {
    for (const file of forbiddenLegacyInfrastructureFiles) {
      expect(existsSync(file), `${file} should not exist`).toBe(false)
    }
  })
})
