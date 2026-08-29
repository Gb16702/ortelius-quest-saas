import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const layerRoots = [
  join(process.cwd(), 'src/domains/messaging/conversation/domain'),
  join(process.cwd(), 'src/domains/messaging/conversation/application'),
].filter((path) => existsSync(path))

const presentationRoot = join(process.cwd(), 'src/domains/messaging/conversation/presentation')

const forbiddenRootCompatibilityFacades = [
  'src/domains/messaging/conversation/conversation.routes.ts',
  'src/domains/messaging/conversation/conversation.services.ts',
]

const forbiddenImports = [
  'hono',
  'drizzle-orm',
  'stripe',
  'openai',
  '@aws-sdk/',
  '../../../infrastructure',
  '../../../../infrastructure',
  '../infrastructure',
]

const forbiddenPresentationImports = [
  'drizzle-orm',
  '/database',
  'db/schemas',
  'message.services',
  'realtime.services',
  'conversation.repository',
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

describe('Conversation architecture', () => {
  it('keeps domain and application independent from infrastructure and adapters', () => {
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

  it('keeps presentation free of direct persistence and cross-adapter services', () => {
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
