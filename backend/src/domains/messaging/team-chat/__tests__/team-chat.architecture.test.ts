import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const layerRoots = [
  join(process.cwd(), 'src/domains/messaging/team-chat/domain'),
  join(process.cwd(), 'src/domains/messaging/team-chat/application'),
].filter((path) => existsSync(path))

const forbiddenRootCompatibilityFacades = ['src/domains/messaging/team-chat/team-chat.service.ts']

const forbiddenImports = [
  'hono',
  'drizzle-orm',
  'stripe',
  'openai',
  '@aws-sdk/',
  '../../../infrastructure',
  '../../../../infrastructure',
  '../infrastructure',
  '../message/message.services',
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

describe('Team chat architecture', () => {
  it('keeps domain and application independent from infrastructure and message services', () => {
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

  it('keeps removed root service files from coming back', () => {
    for (const file of forbiddenRootCompatibilityFacades) {
      expect(existsSync(file), `${file} should not exist`).toBe(false)
    }
  })
})
