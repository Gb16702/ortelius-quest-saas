import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const layerRoots = [
  join(process.cwd(), 'src/domains/organization/domain'),
  join(process.cwd(), 'src/domains/organization/application'),
].filter((path) => existsSync(path))
const presentationRoot = join(process.cwd(), 'src/domains/organization/presentation')

const forbiddenRootCompatibilityFacades = [
  'src/domains/organization/organization.routes.ts',
  'src/domains/organization/organization-status.routes.ts',
  'src/domains/organization/organization.schemas.ts',
  'src/domains/organization/organization.colors.ts',
  'src/domains/organization/organization.types.ts',
  'src/domains/organization/organization-stripe-customer.service.ts',
  'src/routes/organization.routes.ts',
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

describe('Organization architecture', () => {
  it('keeps domain and application independent from infrastructure/framework adapters', () => {
    const forbiddenImports = [
      'hono',
      'drizzle-orm',
      'stripe',
      'openai',
      '@aws-sdk/',
      '../../infrastructure',
      '../../../infrastructure',
      'db/schemas',
    ]

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

  it('keeps presentation adapters free of direct persistence imports', () => {
    const forbiddenImports = ['drizzle-orm', 'database', 'db/schemas']

    const violations = collectTsFiles(presentationRoot).flatMap((file) => {
      const imports = collectImportSpecifiers(readFileSync(file, 'utf8'))
      return imports
        .filter((specifier) => forbiddenImports.some((forbidden) => specifier.includes(forbidden)))
        .map((specifier) => `${relative(process.cwd(), file)} imports ${specifier}`)
    })

    expect(violations).toEqual([])
  })

  it('keeps removed root compatibility facades from coming back', () => {
    for (const file of forbiddenRootCompatibilityFacades) {
      expect(existsSync(file), `${file} should not exist`).toBe(false)
    }
  })
})
