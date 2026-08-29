import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const innerLayerRoots = [
  join(process.cwd(), 'src/domains/activity/domain'),
  join(process.cwd(), 'src/domains/activity/application'),
]
const presentationRoot = join(process.cwd(), 'src/domains/activity/presentation')

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
  'activity.repository',
]

const forbiddenRootCompatibilityFacades = [
  'src/domains/activity/activity.routes.ts',
  'src/domains/activity/activity.schemas.ts',
  'src/domains/activity/activity.services.ts',
  'src/domains/activity/activity.types.ts',
  'src/domains/activity/activity.constants.ts',
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

describe('Activity architecture', () => {
  it('keeps domain and application independent from infrastructure/framework adapters', () => {
    const violations = innerLayerRoots.flatMap((root) =>
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

  it('keeps presentation free of direct persistence imports', () => {
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

  it('keeps removed root compatibility facades from coming back', () => {
    for (const file of forbiddenRootCompatibilityFacades) {
      expect(existsSync(file), `${file} should not exist`).toBe(false)
    }
  })
})
