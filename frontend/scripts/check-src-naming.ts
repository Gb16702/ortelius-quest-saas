import { readdirSync } from "node:fs"
import { basename, extname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

interface NamingViolation {
    path: string
    message: string
}

const repoRoot = fileURLToPath(new URL("..", import.meta.url))
const srcRoot = join(repoRoot, "src")

const sourceExtensions = new Set([".ts", ".tsx"])
const ignoredDirectories = new Set(["node_modules", "build", ".git"])
const fsdRoots = new Set(["app", "pages", "widgets", "features", "entities", "shared"])
const sliceLayers = new Set(["pages", "widgets", "features", "entities"])
const appSegments = new Set([
    "api",
    "assets",
    "config",
    "lib",
    "model",
    "providers",
    "routes",
    "seo",
    "server",
    "styles",
    "test",
])
const sharedSegments = new Set([
    "api",
    "assets",
    "config",
    "lib",
    "model",
    "server",
    "styles",
    "test",
    "ui",
])
const sliceSegments = {
    pages: new Set(["api", "model", "ui", "lib", "config", "server", "test"]),
    widgets: new Set(["api", "model", "ui", "lib", "config", "server", "test"]),
    features: new Set(["api", "model", "ui", "lib", "config", "server", "test"]),
    entities: new Set(["api", "model", "ui", "lib", "config", "server", "test", "@x"]),
}

const forbiddenTechnicalDirectories = new Set([
    "components",
    "constants",
    "data",
    "helpers",
    "reducers",
    "stores",
    "types",
    "utils",
])

const forbiddenGenericFileBasenames = new Set([
    "actions",
    "api",
    "constants",
    "data",
    "helpers",
    "mutations",
    "query-keys",
    "reducer",
    "schema",
    "selectors",
    "state",
    "store",
    "types",
    "utils",
])

const forbiddenTechnicalSuffixes = new Set(["constants", "helpers", "model", "types", "utils"])
const allowedDotSuffixes = new Set([
    "api",
    "builder",
    "cache",
    "client",
    "config",
    "context",
    "contract",
    "cookies",
    "dto",
    "endpoint",
    "factory",
    "fixture",
    "fixtures",
    "guards",
    "headers",
    "mapper",
    "mock",
    "mocks",
    "mutation",
    "mutations",
    "page",
    "permissions",
    "provider",
    "queries",
    "query",
    "query-keys",
    "query-options",
    "reducer",
    "response",
    "schema",
    "selectors",
    "server",
    "spec",
    "state",
    "store",
    "stories",
    "story",
    "stub",
    "test",
    "test-utils",
    "types",
])
const apiFileSuffixes = new Set([
    "api",
    "cache",
    "contract",
    "cookies",
    "dto",
    "endpoint",
    "headers",
    "mutation",
    "mutations",
    "queries",
    "query",
    "query-keys",
    "query-options",
    "response",
])
const apiOrLibFileSuffixes = new Set(["mapper"])
const modelFileSuffixes = new Set([
    "guards",
    "permissions",
    "reducer",
    "selectors",
    "store",
    "types",
])
const alwaysDotFileSuffixes = new Set([
    "client",
    "config",
    "context",
    "cookies",
    "endpoint",
    "headers",
    "provider",
    "response",
])
const forbiddenHyphenRoleSuffixes = new Set([
    ...apiFileSuffixes,
    ...apiOrLibFileSuffixes,
    ...modelFileSuffixes,
    ...alwaysDotFileSuffixes,
    "state",
])

function toPosix(path: string): string {
    return path.split(sep).join("/")
}

function toRepoPath(path: string): string {
    return toPosix(relative(repoRoot, path))
}

function isKebabCase(value: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

function isFrameworkRoutePath(path: string): boolean {
    // Framework route files use syntax outside normal kebab-case, such as $slug and __root.
    return path === "src/app/routes" || path.startsWith("src/app/routes/")
}

function isAllowedRouteOrShim(path: string): boolean {
    return isFrameworkRoutePath(path) || path === "src/app/model/route-tree.gen.ts"
}

function collect(directory: string): { files: string[]; directories: string[] } {
    const files: string[] = []
    const directories: string[] = []

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const entryPath = join(directory, entry.name)

        if (entry.isDirectory()) {
            if (ignoredDirectories.has(entry.name)) continue
            directories.push(entryPath)
            const nested = collect(entryPath)
            files.push(...nested.files)
            directories.push(...nested.directories)
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

    return { files, directories }
}

function validateDirectory(path: string): NamingViolation[] {
    const repoPath = toRepoPath(path)
    if (isAllowedRouteOrShim(repoPath)) return []

    const parts = repoPath.split("/")
    const [, root, sliceOrSegment, segment] = parts
    const name = basename(repoPath)
    const violations: NamingViolation[] = []

    if (!fsdRoots.has(root)) {
        violations.push({
            path: repoPath,
            message: "Directory must live under an approved FSD root.",
        })
    }

    if (name !== "@x" && !isKebabCase(name)) {
        violations.push({
            path: repoPath,
            message:
                "Directory names must use kebab-case, except entity @x APIs and route folders.",
        })
    }

    if (forbiddenTechnicalDirectories.has(name)) {
        violations.push({
            path: repoPath,
            message:
                "Directory name is a technical bucket. Use an FSD segment or a domain-specific folder name.",
        })
    }

    if (root === "app" && parts.length === 3 && !appSegments.has(sliceOrSegment)) {
        violations.push({
            path: repoPath,
            message: `App directory must be one of: ${[...appSegments].join(", ")}.`,
        })
    }

    if (root === "shared" && parts.length === 3 && !sharedSegments.has(sliceOrSegment)) {
        violations.push({
            path: repoPath,
            message: `Shared directory must be one of: ${[...sharedSegments].join(", ")}.`,
        })
    }

    if (sliceLayers.has(root) && parts.length === 4) {
        const allowedSegments = sliceSegments[root as keyof typeof sliceSegments]
        if (!allowedSegments.has(segment)) {
            violations.push({
                path: repoPath,
                message: `${root}/${sliceOrSegment} must use one of these FSD segments: ${[
                    ...allowedSegments,
                ].join(", ")}.`,
            })
        }
    }

    return violations
}

function validateFileRoleLocations(
    repoPath: string,
    domainName: string,
    dotSuffix: string
): NamingViolation[] {
    const violations: NamingViolation[] = []
    const suffix = domainName.split("-").at(-1)
    const isApiSegment = repoPath.includes("/api/")
    const isLibSegment = repoPath.includes("/lib/")
    const isModelSegment = repoPath.includes("/model/")
    const isTechnicalCodeSegment =
        isApiSegment || isModelSegment || repoPath.startsWith("src/shared/")

    if (!dotSuffix && suffix && forbiddenTechnicalSuffixes.has(suffix) && isTechnicalCodeSegment) {
        violations.push({
            path: repoPath,
            message:
                "File name ends with a technical bucket suffix in api/model/shared code. Use a precise domain name.",
        })
    }

    if (dotSuffix === "store" && !domainName.startsWith("use-")) {
        violations.push({
            path: repoPath,
            message: "Store hook files must use use-*.store.ts.",
        })
    }

    if (!dotSuffix && domainName.endsWith("-store") && !domainName.startsWith("use-")) {
        violations.push({
            path: repoPath,
            message: "Store hook files must use use-*.store.ts.",
        })
    }

    const hyphenRoleSuffix = [...forbiddenHyphenRoleSuffixes].find((fileSuffix) =>
        domainName.endsWith(`-${fileSuffix}`)
    )
    if (!dotSuffix && hyphenRoleSuffix && isTechnicalCodeSegment) {
        violations.push({
            path: repoPath,
            message: `Use dot suffix ".${hyphenRoleSuffix}" instead of "-${hyphenRoleSuffix}" in api/model/shared code.`,
        })
    }

    if (dotSuffix && apiFileSuffixes.has(dotSuffix) && !isApiSegment) {
        violations.push({
            path: repoPath,
            message: `Files ending with .${dotSuffix}.ts belong in the slice api segment.`,
        })
    }

    if (dotSuffix && apiOrLibFileSuffixes.has(dotSuffix) && !isApiSegment && !isLibSegment) {
        violations.push({
            path: repoPath,
            message: `Files ending with .${dotSuffix}.ts belong in api/ or lib/.`,
        })
    }

    if (dotSuffix && modelFileSuffixes.has(dotSuffix) && !isModelSegment) {
        violations.push({
            path: repoPath,
            message: `Files ending with .${dotSuffix}.ts belong in the model segment.`,
        })
    }

    return violations
}

function validateFile(path: string): NamingViolation[] {
    const repoPath = toRepoPath(path)
    if (isAllowedRouteOrShim(repoPath)) return []

    const name = basename(repoPath)
    const extension = extname(name)
    const stem = name.slice(0, -extension.length)
    const violations: NamingViolation[] = []

    if (stem === "index" || stem === "index.server") return []

    const [domainName, ...dotSuffixParts] = stem.split(".")
    const dotSuffix = dotSuffixParts.join(".")

    if (!isKebabCase(domainName)) {
        violations.push({
            path: repoPath,
            message:
                "File names must start with a kebab-case domain/action name. Use only approved dot suffixes.",
        })
    }

    if (dotSuffix && !allowedDotSuffixes.has(dotSuffix)) {
        violations.push({
            path: repoPath,
            message: `Dot suffix ".${dotSuffix}" is not allowed. Allowed suffixes: ${[
                ...allowedDotSuffixes,
            ].join(", ")}.`,
        })
    }

    if (!dotSuffix && forbiddenGenericFileBasenames.has(domainName)) {
        violations.push({
            path: repoPath,
            message: "File name is a generic technical bucket. Use a domain-specific name instead.",
        })
    }

    violations.push(...validateFileRoleLocations(repoPath, domainName, dotSuffix))

    return violations
}

const { files, directories } = collect(srcRoot)
const violations = [...directories.flatMap(validateDirectory), ...files.flatMap(validateFile)]

if (violations.length > 0) {
    console.error("Source naming violations found:")
    for (const violation of violations) {
        console.error(`${violation.path} ${violation.message}`)
    }
    process.exitCode = 1
} else {
    console.log("Source naming check passed.")
}
