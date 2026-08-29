import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig, loadEnv } from "vite"
import { getLegalPagePrerenderPaths } from "./src/app/seo/legal-pages"
import { getMarketingPagePrerenderPaths } from "./src/app/seo/marketing-pages"

const repoRoot = dirname(fileURLToPath(import.meta.url))
const defaultDevPort = 5174
const defaultDevHost = "127.0.0.1"

function getDevServerPort(): number {
    const baseUrlPort = getPortFromUrl(process.env.PLAYWRIGHT_BASE_URL)
    if (baseUrlPort) return baseUrlPort

    const explicitPort = Number(process.env.PORT)
    return Number.isInteger(explicitPort) && explicitPort > 0 ? explicitPort : defaultDevPort
}

function getDevServerHost(): string {
    const baseUrlHost = getHostFromUrl(process.env.PLAYWRIGHT_BASE_URL)
    if (baseUrlHost) return baseUrlHost

    return process.env.HOST ?? defaultDevHost
}

function getPortFromUrl(value: string | undefined): number | null {
    if (!value) return null

    try {
        const port = Number(new URL(value).port)
        return Number.isInteger(port) && port > 0 ? port : null
    } catch {
        return null
    }
}

function getHostFromUrl(value: string | undefined): string | null {
    if (!value) return null

    try {
        return new URL(value).hostname || null
    } catch {
        return null
    }
}

function getBooleanEnvFlag(value: string | undefined, name: string): boolean | null {
    if (!value) return null

    const normalizedValue = value.toLowerCase()
    if (["1", "true", "yes"].includes(normalizedValue)) return true
    if (["0", "false", "no"].includes(normalizedValue)) return false

    throw new Error(`${name} must be one of true, false, 1, 0, yes, or no`)
}

function usesUrlProtocol(value: string | undefined, protocol: "https:" | "wss:"): boolean {
    if (!value) return false

    try {
        return new URL(value).protocol === protocol
    } catch {
        return false
    }
}

function shouldEnablePrerender(mode: string): boolean {
    const env = { ...loadEnv(mode, repoRoot, ""), ...process.env }
    const explicitPrerender = getBooleanEnvFlag(env.PRERENDER, "PRERENDER")

    if (explicitPrerender !== null) return explicitPrerender

    return (
        usesUrlProtocol(env.APP_ORIGIN, "https:") &&
        usesUrlProtocol(env.AUTH_URL, "https:") &&
        usesUrlProtocol(env.LOGIN_URL, "https:") &&
        usesUrlProtocol(env.API_URL, "https:") &&
        usesUrlProtocol(env.VITE_API_URL, "https:") &&
        usesUrlProtocol(env.VITE_WS_URL, "wss:")
    )
}

const prerenderPages = [
    ...getMarketingPagePrerenderPaths("home"),
    ...getMarketingPagePrerenderPaths("pricing"),
    ...getMarketingPagePrerenderPaths("contact"),
    ...getLegalPagePrerenderPaths("privacy"),
    ...getLegalPagePrerenderPaths("terms"),
    ...getLegalPagePrerenderPaths("cookies"),
].map((path) => ({ path }))

export default defineConfig(({ mode }) => {
    const prerenderEnabled = shouldEnablePrerender(mode)

    return {
        publicDir: resolve(repoRoot, "public"),
        resolve: {
            tsconfigPaths: true,
            alias: {
                "@": resolve(repoRoot, "src"),
            },
        },
        plugins: [
            tailwindcss(),
            tanstackStart({
                srcDirectory: "src/app",
                router: {
                    entry: "model/router",
                    generatedRouteTree: "model/route-tree.gen.ts",
                    routesDirectory: "routes",
                },
                pages: prerenderPages,
                prerender: {
                    enabled: prerenderEnabled,
                    autoStaticPathsDiscovery: false,
                    crawlLinks: false,
                    failOnError: true,
                    retryCount: 0,
                },
            }),
            nitro(),
            viteReact(),
        ],
        server: {
            host: getDevServerHost(),
            port: getDevServerPort(),
            ...(mode === "development" && { allowedHosts: true }),
        },
    }
})
