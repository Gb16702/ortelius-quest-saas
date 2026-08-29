import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const layerRoots = [
  join(process.cwd(), 'src/domains/requests/domain'),
  join(process.cwd(), 'src/domains/requests/application'),
]

const presentationRoot = join(process.cwd(), 'src/domains/requests/presentation')
const infrastructureRoot = join(process.cwd(), 'src/domains/requests/infrastructure')
const conversationOrchestratorFiles = [
  join(
    process.cwd(),
    'src/domains/requests/infrastructure/request-creation-conversation.adapter.ts'
  ),
  join(
    process.cwd(),
    'src/domains/requests/infrastructure/request-linking-conversation.adapter.ts'
  ),
]

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
  'team-chat.service',
  'activity.application',
]

const forbiddenConversationOrchestratorImports = [
  'drizzle-orm',
  '/database',
  'db/schemas',
  'message.services',
]

const forbiddenInfrastructureImports = ['organization.services']

const forbiddenRootCompatibilitySurfaces = ['src/domains/requests/requests.types.ts']

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

describe('Requests architecture', () => {
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

  it('keeps request conversation orchestration behind query, persistence, and message adapters', () => {
    const violations = conversationOrchestratorFiles.flatMap((file) => {
      const imports = collectImportSpecifiers(readFileSync(file, 'utf8'))
      return imports
        .filter((specifier) =>
          forbiddenConversationOrchestratorImports.some((forbidden) =>
            specifier.includes(forbidden)
          )
        )
        .map((specifier) => `${relative(process.cwd(), file)} imports ${specifier}`)
    })

    expect(violations).toEqual([])
  })

  it('keeps request infrastructure independent from organization services', () => {
    const violations = collectTsFiles(infrastructureRoot).flatMap((file) => {
      const imports = collectImportSpecifiers(readFileSync(file, 'utf8'))
      return imports
        .filter((specifier) =>
          forbiddenInfrastructureImports.some((forbidden) => specifier.includes(forbidden))
        )
        .map((specifier) => `${relative(process.cwd(), file)} imports ${specifier}`)
    })

    expect(violations).toEqual([])
  })

  it('keeps removed root compatibility surfaces from coming back', () => {
    for (const file of forbiddenRootCompatibilitySurfaces) {
      expect(existsSync(file), `${file} should not exist`).toBe(false)
    }
  })
})
