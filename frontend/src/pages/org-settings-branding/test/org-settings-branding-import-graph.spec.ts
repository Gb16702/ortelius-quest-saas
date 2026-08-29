import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import * as ts from "typescript"

const repoRoot = process.cwd()
const srcRoot = join(repoRoot, "src")

function toRepoPath(path: string): string {
    return relative(repoRoot, path).split(sep).join("/")
}

function resolveSourceFile(pathWithoutExtension: string): string | null {
    const candidates = [
        pathWithoutExtension,
        `${pathWithoutExtension}.ts`,
        `${pathWithoutExtension}.tsx`,
        join(pathWithoutExtension, "index.ts"),
        join(pathWithoutExtension, "index.tsx"),
    ]

    return (
        candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ??
        null
    )
}

function resolveSourceSpecifier(importerPath: string, specifier: string): string | null {
    if (specifier.startsWith("@/")) {
        return resolveSourceFile(join(srcRoot, specifier.slice(2)))
    }

    if (specifier.startsWith(".")) {
        return resolveSourceFile(resolve(importerPath, "..", specifier))
    }

    return null
}

function getRuntimeSourceSpecifiers(filePath: string): string[] {
    const sourceText = readFileSync(filePath, "utf8")
    const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    )
    const specifiers: string[] = []

    const visit = (node: ts.Node) => {
        if (
            ts.isImportDeclaration(node) &&
            !node.importClause?.isTypeOnly &&
            node.moduleSpecifier &&
            ts.isStringLiteralLike(node.moduleSpecifier)
        ) {
            specifiers.push(node.moduleSpecifier.text)
        }

        if (
            ts.isExportDeclaration(node) &&
            !node.isTypeOnly &&
            node.moduleSpecifier &&
            ts.isStringLiteralLike(node.moduleSpecifier)
        ) {
            specifiers.push(node.moduleSpecifier.text)
        }

        ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    return specifiers
}

function collectRuntimeImportGraph(entryPath: string): string[] {
    const visited = new Set<string>()
    const pending = [entryPath]

    while (pending.length > 0) {
        const currentPath = pending.pop()
        if (!currentPath || visited.has(currentPath)) continue

        visited.add(currentPath)

        for (const specifier of getRuntimeSourceSpecifiers(currentPath)) {
            const resolvedPath = resolveSourceSpecifier(currentPath, specifier)
            if (resolvedPath && !visited.has(resolvedPath)) {
                pending.push(resolvedPath)
            }
        }
    }

    return [...visited].map(toRepoPath).sort()
}

describe("org settings branding import graph", () => {
    it("does not pull Business or Invoices settings feature slices into the Branding page", () => {
        const graph = collectRuntimeImportGraph(
            join(srcRoot, "pages/org-settings-branding/ui/org-settings-branding.page.tsx")
        )
        const forbiddenSettingsModules = graph.filter(
            (path) =>
                path.startsWith("src/features/settings/") ||
                path.startsWith("src/features/organization-business-settings/") ||
                path.startsWith("src/features/organization-invoice-settings/") ||
                path.startsWith("src/entities/organization-business-catalog/")
        )

        expect(graph).toContain("src/features/organization-branding-settings/index.ts")
        expect(forbiddenSettingsModules).toEqual([])
    })
})
