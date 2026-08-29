import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"

type FsdLayer = "app" | "pages" | "widgets" | "features" | "entities" | "shared"

interface ImportReference {
    filePath: string
    specifier: string
    line: number
    column: number
}

interface BoundaryViolation extends ImportReference {
    message: string
}

interface LayerInfo {
    layer: FsdLayer
    slice: string | null
}

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))
const appRoot = join(repoRoot, "src")
const sourceExtensions = new Set([".ts", ".tsx"])
const ignoredDirectories = new Set(["node_modules", "build", "public", ".git"])
const sliceLayers = new Set<FsdLayer>(["pages", "widgets", "features", "entities"])
const publicApiAlwaysEnforcedLayers = new Set<FsdLayer>([
    "pages",
    "widgets",
    "features",
    "entities",
])
const fsdSourceDirectories = new Set(["app", "pages", "widgets", "features", "entities", "shared"])
const layerRanks: Record<FsdLayer, number> = {
    shared: 0,
    entities: 1,
    features: 2,
    widgets: 3,
    pages: 4,
    app: 5,
}

function toPosix(path: string): string {
    return path.split(sep).join("/")
}

function toRepoPath(path: string): string {
    return toPosix(relative(repoRoot, path))
}

function isInPath(path: string, directory: string): boolean {
    return path === directory || path.startsWith(`${directory}/`)
}

function getSliceName(path: string, layer: FsdLayer): string | null {
    const match = new RegExp(`^src/${layer}/([^/]+)`).exec(path)
    return match?.[1] ?? null
}

function getLayerInfo(path: string): LayerInfo | null {
    if (isInPath(path, "src/app")) {
        return { layer: "app", slice: null }
    }

    for (const layer of ["pages", "widgets", "features", "entities"] as const) {
        if (isInPath(path, `src/${layer}`)) {
            return { layer, slice: getSliceName(path, layer) }
        }
    }

    if (isInPath(path, "src/shared")) {
        return { layer: "shared", slice: null }
    }

    return null
}

function collectSourceFiles(directory: string): string[] {
    const files: string[] = []
    const entries = readdirSync(directory, { withFileTypes: true })

    for (const entry of entries) {
        const entryPath = join(directory, entry.name)

        if (entry.isDirectory()) {
            if (!ignoredDirectories.has(entry.name)) {
                files.push(...collectSourceFiles(entryPath))
            }
            continue
        }

        if (
            entry.isFile() &&
            sourceExtensions.has(extname(entry.name)) &&
            !entry.name.endsWith(".d.ts")
        ) {
            files.push(entryPath)
        }
    }

    return files
}

function isImportCall(expression: ts.Expression): boolean {
    return (
        expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(expression) && expression.text === "require")
    )
}

function getImportReferences(filePath: string): ImportReference[] {
    const sourceText = readFileSync(filePath, "utf8")
    const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
    )
    const references: ImportReference[] = []

    const addReference = (node: ts.Node, specifier: string) => {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        references.push({
            filePath,
            specifier,
            line: position.line + 1,
            column: position.character + 1,
        })
    }

    const visit = (node: ts.Node) => {
        if (
            (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
            node.moduleSpecifier &&
            ts.isStringLiteralLike(node.moduleSpecifier)
        ) {
            addReference(node.moduleSpecifier, node.moduleSpecifier.text)
        }

        if (ts.isCallExpression(node) && node.arguments.length === 1) {
            const [argument] = node.arguments
            if (argument && ts.isStringLiteralLike(argument) && isImportCall(node.expression)) {
                addReference(argument, argument.text)
            }
        }

        ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    return references
}

function resolveImportPath(importerFilePath: string, specifier: string): string | null {
    if (specifier.startsWith("@/")) {
        return toPosix(join("src", specifier.slice(2))).replace(/\/$/, "")
    }

    if (!specifier.startsWith(".")) {
        return null
    }

    const resolvedPath = resolve(dirname(importerFilePath), specifier)
    const repoPath = toRepoPath(resolvedPath)

    return repoPath.startsWith("src/") ? repoPath : null
}

function isSlicePublicApiPath(path: string, info: LayerInfo): boolean {
    if (!info.slice) return false

    const sliceRoot = `src/${info.layer}/${info.slice}`
    return (
        path === sliceRoot ||
        path === `${sliceRoot}/index` ||
        path === `${sliceRoot}/index.server` ||
        path === `${sliceRoot}/index.server.ts` ||
        path === `${sliceRoot}/index.ts` ||
        path === `${sliceRoot}/index.tsx`
    )
}

function isEntityCrossImportPublicApiPath(
    path: string,
    sourceInfo: LayerInfo,
    targetInfo: LayerInfo
): boolean {
    if (sourceInfo.layer !== "entities" || targetInfo.layer !== "entities") return false
    if (!sourceInfo.slice || !targetInfo.slice) return false

    const crossImportRoot = `src/entities/${targetInfo.slice}/@x/${sourceInfo.slice}`
    return (
        path === crossImportRoot ||
        path === `${crossImportRoot}.ts` ||
        path === `${crossImportRoot}.tsx`
    )
}

function hasPublicApi(info: LayerInfo): boolean {
    if (!info.slice) return false

    const sliceRoot = join(repoRoot, "src", info.layer, info.slice)
    return (
        existsSync(join(sliceRoot, "index.ts")) ||
        existsSync(join(sliceRoot, "index.tsx")) ||
        existsSync(join(sliceRoot, "index.server.ts"))
    )
}

function shouldEnforcePublicApi(info: LayerInfo): boolean {
    return publicApiAlwaysEnforcedLayers.has(info.layer) || hasPublicApi(info)
}

function getFsdLayerViolation(sourcePath: string, targetPath: string): string | null {
    const sourceInfo = getLayerInfo(sourcePath)
    const targetInfo = getLayerInfo(targetPath)

    if (!sourceInfo || !targetInfo) return null

    if (sourceInfo.layer === "shared" && targetInfo.layer !== "shared") {
        return "FSD shared layer must not import business or app layers."
    }

    if (sourceInfo.layer === "app" || targetInfo.layer === "shared") {
        return null
    }

    if (sourceInfo.layer === targetInfo.layer) {
        if (!sliceLayers.has(sourceInfo.layer)) return null

        if (sourceInfo.slice && sourceInfo.slice === targetInfo.slice) {
            if (
                isSlicePublicApiPath(targetPath, targetInfo) &&
                !isSlicePublicApiPath(sourcePath, sourceInfo)
            ) {
                return "Files inside a slice must import sibling modules directly, not through the slice public API."
            }

            return null
        }

        if (isEntityCrossImportPublicApiPath(targetPath, sourceInfo, targetInfo)) {
            return null
        }

        return `Cross-slice import on the ${sourceInfo.layer} layer is not allowed. Move shared logic to a lower layer or expose an explicit public API.`
    }

    if (layerRanks[targetInfo.layer] >= layerRanks[sourceInfo.layer]) {
        return `FSD import direction violation: ${sourceInfo.layer} can only import layers below it, but imported ${targetInfo.layer}.`
    }

    return null
}

function getPublicApiViolation(sourcePath: string, targetPath: string): string | null {
    const sourceInfo = getLayerInfo(sourcePath)
    const targetInfo = getLayerInfo(targetPath)

    if (!sourceInfo || !targetInfo || !targetInfo.slice) return null
    if (!sliceLayers.has(targetInfo.layer) || !shouldEnforcePublicApi(targetInfo)) return null

    const isSameSlice =
        sourceInfo.layer === targetInfo.layer &&
        sourceInfo.slice !== null &&
        sourceInfo.slice === targetInfo.slice

    if (isSameSlice) return null

    if (
        isSlicePublicApiPath(targetPath, targetInfo) ||
        isEntityCrossImportPublicApiPath(targetPath, sourceInfo, targetInfo)
    ) {
        return null
    }

    return `External modules must import ${targetInfo.layer}/${targetInfo.slice} through its public API.`
}

function isFsdSourcePath(path: string): boolean {
    const match = /^src\/([^/]+)/.exec(path)
    if (!match) return false

    return fsdSourceDirectories.has(match[1])
}

function getFsdRootBoundaryViolation(sourcePath: string, targetPath: string): string | null {
    if (sourcePath.startsWith("src/") && !isFsdSourcePath(sourcePath)) {
        return "Source files must live inside an FSD root: src/app, src/pages, src/widgets, src/features, src/entities, or src/shared."
    }

    if (targetPath.startsWith("src/") && !isFsdSourcePath(targetPath)) {
        return "Imports must target an FSD root: src/app, src/pages, src/widgets, src/features, src/entities, or src/shared."
    }

    return null
}

function getFsdRootLocationViolation(sourcePath: string): string | null {
    if (isFsdSourcePath(sourcePath)) return null

    return "Source files must live inside an FSD root: src/app, src/pages, src/widgets, src/features, src/entities, or src/shared."
}

function getSameSliceSelfAliasViolation(
    sourcePath: string,
    targetPath: string,
    specifier: string
): string | null {
    if (!specifier.startsWith("@/")) return null

    const sourceInfo = getLayerInfo(sourcePath)
    const targetInfo = getLayerInfo(targetPath)

    if (!sourceInfo || !targetInfo) return null
    if (sourceInfo.layer !== targetInfo.layer || sourceInfo.slice !== targetInfo.slice) return null
    if (!sourceInfo.slice || !sliceLayers.has(sourceInfo.layer)) return null

    return "Files inside a slice must use relative imports for sibling modules."
}

function getBoundaryViolation(sourcePath: string, targetPath: string): string | null {
    return (
        getFsdRootBoundaryViolation(sourcePath, targetPath) ??
        getFsdLayerViolation(sourcePath, targetPath) ??
        getPublicApiViolation(sourcePath, targetPath)
    )
}

function getPublicApiExportViolations(filePath: string): BoundaryViolation[] {
    const sourcePath = toRepoPath(filePath)
    const info = getLayerInfo(sourcePath)
    if (!info || !info.slice || !isSlicePublicApiPath(sourcePath, info)) return []

    const sourceText = readFileSync(filePath, "utf8")
    const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
    )
    const violations: BoundaryViolation[] = []

    const visit = (node: ts.Node) => {
        if (
            ts.isExportDeclaration(node) &&
            node.moduleSpecifier &&
            ts.isStringLiteralLike(node.moduleSpecifier) &&
            (!node.exportClause || ts.isNamespaceExport(node.exportClause))
        ) {
            const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
            violations.push({
                filePath,
                specifier: node.moduleSpecifier.text,
                line: position.line + 1,
                column: position.character + 1,
                message:
                    "FSD public APIs must use explicit named re-exports; wildcard exports make slice boundaries porous.",
            })
        }

        ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    return violations
}

function findViolations(): BoundaryViolation[] {
    const violations: BoundaryViolation[] = []

    for (const filePath of collectSourceFiles(appRoot)) {
        const sourcePath = toRepoPath(filePath)
        const fsdRootLocationViolation = getFsdRootLocationViolation(sourcePath)
        if (fsdRootLocationViolation) {
            violations.push({
                filePath,
                specifier: sourcePath,
                line: 1,
                column: 1,
                message: fsdRootLocationViolation,
            })
        }

        violations.push(...getPublicApiExportViolations(filePath))

        for (const reference of getImportReferences(filePath)) {
            const targetPath = resolveImportPath(filePath, reference.specifier)
            if (!targetPath) continue

            const message =
                getSameSliceSelfAliasViolation(sourcePath, targetPath, reference.specifier) ??
                getBoundaryViolation(sourcePath, targetPath)
            if (message) {
                violations.push({ ...reference, message })
            }
        }
    }

    return violations
}

const violations = findViolations()

if (violations.length > 0) {
    console.error("Import boundary violations found:")
    for (const violation of violations) {
        console.error(
            `${toRepoPath(violation.filePath)}:${violation.line}:${violation.column} ${violation.message} Imported "${violation.specifier}".`
        )
    }
    process.exitCode = 1
} else {
    console.log("Import boundary check passed.")
}
