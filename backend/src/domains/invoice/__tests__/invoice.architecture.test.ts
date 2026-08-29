import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const layerRoots = [
  join(process.cwd(), 'src/domains/invoice/domain'),
  join(process.cwd(), 'src/domains/invoice/application'),
].filter((path) => existsSync(path))
const presentationRoot = join(process.cwd(), 'src/domains/invoice/presentation')

const forbiddenInnerLayerImports = [
  'hono',
  'drizzle-orm',
  'stripe',
  'openai',
  '@aws-sdk/',
  '../../infrastructure',
  '../../../infrastructure',
  'db/schemas',
]

const forbiddenPresentationImports = [
  'drizzle-orm',
  'database',
  'db/schemas',
  'invoice.service',
  'invoice.repository',
]
const invoiceRepositoryAdapter = join(
  process.cwd(),
  'src/domains/invoice/infrastructure/invoice.repository.ts'
)
const forbiddenRepositorySideEffectImports = [
  'EmailService',
  'message.services',
  'metrics.services',
  'member-metrics.service',
]

const forbiddenRootCompatibilityFacades = [
  'src/domains/invoice/invoice.routes.ts',
  'src/domains/invoice/invoice.schemas.ts',
  'src/domains/invoice/invoice.middleware.ts',
  'src/domains/invoice/invoice.services.ts',
  'src/domains/invoice/invoice.types.ts',
]

const forbiddenLegacyInfrastructureFiles = ['src/domains/invoice/infrastructure/invoice.service.ts']

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

describe('Invoice architecture', () => {
  it('keeps domain and application independent from infrastructure/framework adapters', () => {
    const violations = layerRoots.flatMap((root) =>
      collectTsFiles(root).flatMap((file) => {
        const imports = collectImportSpecifiers(readFileSync(file, 'utf8'))
        return imports
          .filter((specifier) =>
            forbiddenInnerLayerImports.some((forbidden) => specifier.includes(forbidden))
          )
          .map((specifier) => `${relative(process.cwd(), file)} imports ${specifier}`)
      })
    )

    expect(violations).toEqual([])
  })

  it('keeps presentation adapters free of direct persistence imports', () => {
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

  it('keeps the invoice repository adapter free of lifecycle side-effect services', () => {
    const imports = collectImportSpecifiers(readFileSync(invoiceRepositoryAdapter, 'utf8'))
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
