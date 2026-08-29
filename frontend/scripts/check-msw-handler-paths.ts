import { type Dirent, readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"

interface HandlerPathRef {
    filePath: string
    path: string
    line: number
}

interface OrphanHandler extends HandlerPathRef {
    slicePath: string | null
}

const repoRoot = fileURLToPath(new URL("..", import.meta.url))
const srcRoot = join(repoRoot, "src")
const ALLOW_ORPHAN_MARKER = "msw-allow-orphan"
// PLACEHOLDER stands in for a `${...}` interpolation when we flatten a
// template literal to a plain string. WILD is the sentinel we substitute in
// before regex-escaping so colon-params and template-interpolations both
// become `[^/]+`. They must not share substrings or one would corrupt the
// other during replacement.
const PLACEHOLDER = "MSW_PLACEHOLDER"
const WILD = "__MSW_WILD__"
const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head"])
const IGNORED_DIRECTORIES = new Set(["node_modules", "build", ".git"])

function toPosix(path: string): string {
    return path.split(sep).join("/")
}

function toRepoPath(path: string): string {
    return toPosix(relative(repoRoot, path))
}

function collectHandlerFiles(directory: string): string[] {
    const files: string[] = []
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue
        const entryPath = join(directory, entry.name)
        if (entry.isDirectory()) {
            files.push(...collectHandlerFiles(entryPath))
            continue
        }
        if (!entry.isFile()) continue
        // Shared MSW handler modules.
        if (entry.name.endsWith("-handlers.ts")) {
            files.push(entryPath)
            continue
        }
        // Inline overrides inside spec files (`server.use(http.<method>(...))`).
        // Without scanning these, the check silently misses the most common
        // source of handler-path drift.
        if (entry.name.endsWith(".spec.ts") || entry.name.endsWith(".spec.tsx")) {
            files.push(entryPath)
        }
    }
    return files
}

function safeReaddir(path: string): Dirent[] {
    try {
        return readdirSync(path, { withFileTypes: true })
    } catch {
        return []
    }
}

function isProductionSourceFile(name: string): boolean {
    if (name.endsWith(".d.ts")) return false
    if (name.endsWith(".spec.ts") || name.endsWith(".spec.tsx")) return false
    if (name.endsWith("-handlers.ts")) return false
    const ext = extname(name)
    return ext === ".ts" || ext === ".tsx"
}

function shouldSkipDirectory(name: string): boolean {
    // `test/` segments hold fixtures, factories, mocks, and the spec files
    // themselves — none of which contain production fetches. Excluding them
    // prevents false matches against handler paths.
    return name === "test" || IGNORED_DIRECTORIES.has(name)
}

function collectProductionFiles(rootDirectory: string): string[] {
    const files: string[] = []
    const walk = (directory: string) => {
        for (const entry of safeReaddir(directory)) {
            if (entry.isDirectory()) {
                if (!shouldSkipDirectory(entry.name)) walk(join(directory, entry.name))
                continue
            }
            if (entry.isFile() && isProductionSourceFile(entry.name)) {
                files.push(join(directory, entry.name))
            }
        }
    }
    walk(rootDirectory)
    return files
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&")
}

function mswPathToRegex(path: string): RegExp {
    // Both `/:foo` express-style params and `${...}` template interpolations
    // (already flattened to PLACEHOLDER in `readPathArgument`) match any
    // single URL segment.
    const normalized = path.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, WILD).replaceAll(PLACEHOLDER, WILD)
    const escaped = escapeRegex(normalized)
    const pattern = escaped.replaceAll(WILD, "[^/]+")
    return new RegExp(`^${pattern}$`)
}

function getOwningSlicePath(handlerFilePath: string): string | null {
    const repoPath = toRepoPath(handlerFilePath)
    const match = /^(src\/(features|entities|pages|widgets)\/[^/]+)\//.exec(repoPath)
    if (!match) return null
    const slicePath = join(repoRoot, match[1])
    try {
        if (!statSync(slicePath).isDirectory()) return null
    } catch {
        return null
    }
    return slicePath
}

function parseSourceFile(filePath: string): ts.SourceFile {
    const sourceText = readFileSync(filePath, "utf8")
    const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind)
}

function readLine(text: string, lineStarts: readonly number[], lineIndex: number): string {
    if (lineIndex < 0 || lineIndex >= lineStarts.length) return ""
    const start = lineStarts[lineIndex] ?? 0
    const end = lineStarts[lineIndex + 1] ?? text.length
    return text.slice(start, end)
}

function hasAllowOrphanMarker(
    sourceText: string,
    lineStarts: readonly number[],
    callStartLine: number,
    pathLine: number
): boolean {
    for (const line of [callStartLine - 1, callStartLine, pathLine]) {
        if (readLine(sourceText, lineStarts, line).includes(ALLOW_ORPHAN_MARKER)) return true
    }
    return false
}

function readPathArgument(node: ts.Node): string | null {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return node.text
    }
    // Template literals with `${...}` interpolations are flattened to a
    // plain string where each interpolation becomes PLACEHOLDER. This is
    // the same shape `extractProductionPaths` produces, so the two sides
    // can match on identical normalized strings.
    if (ts.isTemplateExpression(node)) {
        const segments: string[] = [node.head.text]
        for (const span of node.templateSpans) {
            segments.push(PLACEHOLDER)
            segments.push(span.literal.text)
        }
        return segments.join("")
    }
    return null
}

function extractHandlerPaths(filePath: string): HandlerPathRef[] {
    const sourceFile = parseSourceFile(filePath)
    const sourceText = sourceFile.text
    const lineStarts = sourceFile.getLineStarts()
    const refs: HandlerPathRef[] = []

    const visit = (node: ts.Node) => {
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === "http" &&
            HTTP_METHODS.has(node.expression.name.text)
        ) {
            const [firstArg] = node.arguments
            if (firstArg) {
                const rawPath = readPathArgument(firstArg)
                if (rawPath !== null) {
                    // Strip any host/wildcard prefix (e.g., `*/api/...` or
                    // `${API_URL}/api/...`) so the handler regex starts from
                    // `/api/`, matching the production-side normalization in
                    // `extractApiPath`. Paths without `/api/` are kept as-is
                    // — they're out of scope for this check and the orphan
                    // diagnostic points the author to the escape hatch.
                    const path = extractApiPath(rawPath) ?? rawPath
                    const callStartLine = sourceFile.getLineAndCharacterOfPosition(
                        node.getStart(sourceFile)
                    ).line
                    const pathLine = sourceFile.getLineAndCharacterOfPosition(
                        firstArg.getStart(sourceFile)
                    ).line
                    if (!hasAllowOrphanMarker(sourceText, lineStarts, callStartLine, pathLine)) {
                        refs.push({ filePath, path, line: pathLine + 1 })
                    }
                }
            }
        }
        ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return refs
}

function extractApiPath(value: string): string | null {
    const index = value.indexOf("/api/")
    if (index === -1) return null
    return value.slice(index)
}

function extractProductionPaths(filePath: string): string[] {
    const sourceFile = parseSourceFile(filePath)
    const paths: string[] = []
    const collect = (value: string) => {
        const apiPath = extractApiPath(value)
        if (apiPath) paths.push(apiPath)
    }

    const visit = (node: ts.Node) => {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            collect(node.text)
        } else if (ts.isTemplateExpression(node)) {
            const segments: string[] = [node.head.text]
            for (const span of node.templateSpans) {
                segments.push(PLACEHOLDER)
                segments.push(span.literal.text)
            }
            collect(segments.join(""))
        }
        ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return paths
}

function productionPathMatches(handlerRegex: RegExp, productionPath: string): boolean {
    const withoutQuery = productionPath.split("?")[0] ?? productionPath
    const probe = withoutQuery.replaceAll(PLACEHOLDER, "x")
    return handlerRegex.test(probe)
}

function findOrphanHandlers(): OrphanHandler[] {
    const orphans: OrphanHandler[] = []
    // A handler is an orphan if no production fetch *anywhere in src/* matches
    // it. Slice-scoped scanning would force legitimate cross-feature mocks
    // (e.g., a `members` spec mocking `/api/subscription/current`, where the
    // fetch lives in the `subscription` slice) into the escape hatch. The
    // whole-tree scope still catches drift: rename the path on the production
    // side and every consumer's mock stalls until updated.
    const productionPaths = collectProductionFiles(srcRoot).flatMap(extractProductionPaths)

    for (const handlerFile of collectHandlerFiles(srcRoot)) {
        const slicePath = getOwningSlicePath(handlerFile)
        for (const ref of extractHandlerPaths(handlerFile)) {
            const regex = mswPathToRegex(ref.path)
            const matched = productionPaths.some((productionPath) =>
                productionPathMatches(regex, productionPath)
            )
            if (!matched) orphans.push({ ...ref, slicePath })
        }
    }

    return orphans
}

const orphans = findOrphanHandlers()

if (orphans.length > 0) {
    console.error("MSW handler paths with no matching production fetch:")
    for (const orphan of orphans) {
        const handlerRel = toRepoPath(orphan.filePath)
        const sliceHint = orphan.slicePath
            ? ` (handler lives in ${toRepoPath(orphan.slicePath)})`
            : ""
        console.error(
            `${handlerRel}:${orphan.line} handler path "${orphan.path}" has no matching production fetch anywhere under src/ (excluding test/)${sliceHint}. ` +
                `Add a matching production fetch, fix the handler path, or silence with "// ${ALLOW_ORPHAN_MARKER}: <reason>" on the same line.`
        )
    }
    process.exitCode = 1
} else {
    console.log("MSW handler path check passed.")
}
