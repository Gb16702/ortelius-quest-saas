import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const metricsRoot = join(process.cwd(), 'src/domains/metrics')
const layerRoots = [join(metricsRoot, 'domain'), join(metricsRoot, 'application')].filter((path) =>
  existsSync(path)
)

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

const presentationEntrypoints = [
  join(metricsRoot, 'presentation/metrics.routes.ts'),
  join(metricsRoot, 'presentation/graphql/metrics.resolvers.ts'),
  join(metricsRoot, 'presentation/middleware/metrics.middleware.ts'),
]

const forbiddenPresentationEntrypointImports = [
  '../metrics.services',
  '../services/member-metrics.service',
  'drizzle-orm',
  'db/schemas',
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

describe('Metrics architecture', () => {
  it('keeps domain and application independent from frameworks and infrastructure', () => {
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

  it('routes metrics HTTP, GraphQL, and middleware entrypoints through presentation', () => {
    for (const file of presentationEntrypoints) {
      expect(existsSync(file), `${relative(process.cwd(), file)} should exist`).toBe(true)
    }
  })

  it('keeps presentation entrypoints off legacy concrete metrics services', () => {
    const violations = presentationEntrypoints.flatMap((file) => {
      const imports = collectImportSpecifiers(readFileSync(file, 'utf8'))
      return imports
        .filter((specifier) =>
          forbiddenPresentationEntrypointImports.some((forbidden) => specifier.includes(forbidden))
        )
        .map((specifier) => `${relative(process.cwd(), file)} imports ${specifier}`)
    })

    expect(violations).toEqual([])
  })
})
