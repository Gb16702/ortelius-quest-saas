import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const domainsRoot = join(process.cwd(), 'src/domains')

const forbiddenInnerLayerImports = [
  'hono',
  'drizzle-orm',
  'stripe',
  'openai',
  '@aws-sdk/',
  '/infrastructure/',
  '../infrastructure',
  '../../infrastructure',
  '../../../infrastructure',
  '../../../../infrastructure',
  'src/infrastructure',
  'db/schemas',
]

function collectTsFiles(directory: string): string[] {
  const files: string[] = []
  if (!existsSync(directory)) return files

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      files.push(...collectTsFiles(path))
    } else if (path.endsWith('.ts') && !path.endsWith('.test.ts')) {
      files.push(path)
    }
  }

  return files
}

function collectLayerRoots(layerName: 'domain' | 'application'): string[] {
  return readdirSync(domainsRoot)
    .map((domainName) => join(domainsRoot, domainName, layerName))
    .filter((path) => existsSync(path) && statSync(path).isDirectory())
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

describe('Domain architecture layers', () => {
  it('keeps all domain and application layers free of framework and infrastructure imports', () => {
    const layerRoots = [...collectLayerRoots('domain'), ...collectLayerRoots('application')]

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

  it('keeps domain roots free of legacy service, route, schema, type, and repository files', () => {
    const forbiddenRootFilePatterns = [
      /\.routes\.ts$/,
      /\.schemas\.ts$/,
      /\.services\.ts$/,
      /\.service\.ts$/,
      /\.types\.ts$/,
      /\.repository\.ts$/,
    ]

    const violations = readdirSync(domainsRoot)
      .map((domainName) => join(domainsRoot, domainName))
      .filter((path) => statSync(path).isDirectory())
      .flatMap((domainPath) =>
        readdirSync(domainPath)
          .map((entry) => join(domainPath, entry))
          .filter((entryPath) => statSync(entryPath).isFile())
          .filter((entryPath) =>
            forbiddenRootFilePatterns.some((pattern) => pattern.test(entryPath))
          )
          .map((entryPath) => relative(process.cwd(), entryPath))
      )

    expect(violations).toEqual([])
  })
})
