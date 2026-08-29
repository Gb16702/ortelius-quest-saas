import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

const COMMON_API_ERROR_CODES = new Set([
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'PAYMENT_REQUIRED',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_SERVER_ERROR',
  'METHOD_NOT_ALLOWED',
  'PAYLOAD_TOO_LARGE',
  'UPSTREAM_UNAVAILABLE',
])

const endpointFilePattern = /\.(routes|middleware|utils)\.ts$/

function collectEndpointFiles(directory: string): string[] {
  const files: string[] = []

  for (const entry of readdirSync(directory)) {
    if (entry === '__tests__') continue

    const fullPath = join(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...collectEndpointFiles(fullPath))
      continue
    }

    if (endpointFilePattern.test(entry)) {
      files.push(fullPath)
    }
  }

  return files
}

function getObjectPropertyName(property: ts.ObjectLiteralElementLike): string | null {
  if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
    const { name } = property
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
      return name.text
    }
  }

  return null
}

function isFalseLiteral(property: ts.ObjectLiteralElementLike): boolean {
  return (
    ts.isPropertyAssignment(property) && property.initializer.kind === ts.SyntaxKind.FalseKeyword
  )
}

describe('API error response contract', () => {
  it('routes and middleware build error payloads through the typed helper', () => {
    const root = join(process.cwd(), 'src')
    const findings: string[] = []

    for (const file of collectEndpointFiles(root)) {
      const sourceText = readFileSync(file, 'utf8')
      const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true)

      function visit(node: ts.Node): void {
        if (ts.isObjectLiteralExpression(node)) {
          const successProperty = node.properties.find(
            (property) => getObjectPropertyName(property) === 'success'
          )

          if (successProperty && isFalseLiteral(successProperty)) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
            findings.push(`${relative(process.cwd(), file)}:${line + 1}`)
          }
        }

        ts.forEachChild(node, visit)
      }

      visit(sourceFile)
    }

    expect(findings).toEqual([])
  })

  it('does not pass non-common literal codes to createApiErrorResponse', () => {
    const root = join(process.cwd(), 'src')
    const findings: string[] = []

    for (const file of collectEndpointFiles(root)) {
      const sourceText = readFileSync(file, 'utf8')
      const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true)

      function visit(node: ts.Node): void {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'createApiErrorResponse'
        ) {
          const [codeArgument] = node.arguments
          if (codeArgument && ts.isStringLiteral(codeArgument)) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(
              codeArgument.getStart(sourceFile)
            )

            if (!COMMON_API_ERROR_CODES.has(codeArgument.text)) {
              findings.push(`${relative(process.cwd(), file)}:${line + 1}:${codeArgument.text}`)
            }
          }
        }

        ts.forEachChild(node, visit)
      }

      visit(sourceFile)
    }

    expect(findings).toEqual([])
  })
})
