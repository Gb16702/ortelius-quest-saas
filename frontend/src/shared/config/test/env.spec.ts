import { afterAll, describe, expect, it } from "bun:test"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

const importEnvDefaults = {
    VITE_API_URL: "http://localhost:3000",
    VITE_WS_URL: "ws://localhost:3000",
    VITE_PORTAL_ACCOUNT_URL: "http://localhost:3001",
} satisfies Record<string, string>

const originalImportEnv = new Map(
    Object.keys(importEnvDefaults).map((key) => [key, process.env[key]])
)

for (const [key, value] of Object.entries(importEnvDefaults)) {
    process.env[key] = value
}

const { createPublicEnvSchema } = await import("../env")
const { serverEnvSchema } = await import("../server-env.schema")

const productionPublicEnvSchema = createPublicEnvSchema({ isProduction: true })
const developmentPublicEnvSchema = createPublicEnvSchema({ isProduction: false })

afterAll(() => {
    for (const [key, value] of originalImportEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

const secureProductionEnv = {
    API_URL: "https://api.example.test/",
    WS_URL: "wss://ws.example.test/",
    PORTAL_ACCOUNT_URL: "https://portal.example.test/",
    UMAMI_URL: "https://analytics.example.test/script.js",
}

const secureServerProductionEnv = {
    NODE_ENV: "production",
    APP_ORIGIN: "https://app.example.test/",
    AUTH_URL: "https://auth.example.test/",
    API_URL: "https://api.example.test/",
    LOGIN_URL: "https://login.example.test/auth",
}

describe("publicEnvSchema", () => {
    it.each([
        ["API_URL", "http://api.example.test", "API_URL must use HTTPS in production"],
        [
            "PORTAL_ACCOUNT_URL",
            "http://portal.example.test",
            "PORTAL_ACCOUNT_URL must use HTTPS in production",
        ],
        [
            "UMAMI_URL",
            "http://analytics.example.test/script.js",
            "UMAMI_URL must use HTTPS in production",
        ],
        ["WS_URL", "ws://ws.example.test", "WS_URL must use WSS in production"],
    ] as const)("rejects insecure production %s", (key, value, message) => {
        const result = safeParseSchema(productionPublicEnvSchema, {
            ...secureProductionEnv,
            [key]: value,
        })

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues).toContainEqual(
                expect.objectContaining({
                    path: [key],
                    message,
                })
            )
        }
    })

    it("accepts local HTTP and WS URLs outside production", () => {
        const result = safeParseSchema(developmentPublicEnvSchema, {
            API_URL: "http://localhost:3000/",
            WS_URL: "ws://localhost:3000/",
            PORTAL_ACCOUNT_URL: "http://localhost:3001/",
            UMAMI_URL: "http://localhost:3002/script.js",
        })

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.API_URL).toBe("http://localhost:3000")
            expect(result.data.WS_URL).toBe("ws://localhost:3000")
            expect(result.data.PORTAL_ACCOUNT_URL).toBe("http://localhost:3001")
        }
    })
})

describe("serverEnvSchema", () => {
    it("canonicalizes APP_ORIGIN to the origin value", () => {
        const result = safeParseSchema(serverEnvSchema, {
            ...secureServerProductionEnv,
            APP_ORIGIN: "https://app.example.test/",
        })

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.APP_ORIGIN).toBe("https://app.example.test")
        }
    })

    it("rejects insecure production APP_ORIGIN", () => {
        const result = safeParseSchema(serverEnvSchema, {
            ...secureServerProductionEnv,
            APP_ORIGIN: "http://app.example.test",
        })

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues).toContainEqual(
                expect.objectContaining({
                    path: ["APP_ORIGIN"],
                    message: "APP_ORIGIN must use HTTPS in production",
                })
            )
        }
    })

    it.each([
        "https://app.example.test/auth",
        "https://app.example.test?next=/home",
        "https://app.example.test#home",
        "https://user:pass@app.example.test",
    ])("rejects non-origin APP_ORIGIN value %s", (appOrigin) => {
        const result = safeParseSchema(serverEnvSchema, {
            ...secureServerProductionEnv,
            APP_ORIGIN: appOrigin,
        })

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues).toContainEqual(
                expect.objectContaining({
                    path: ["APP_ORIGIN"],
                    message:
                        "APP_ORIGIN must be an origin without path, search, hash, or credentials",
                })
            )
        }
    })

    it("accepts local HTTP APP_ORIGIN outside production", () => {
        const result = safeParseSchema(serverEnvSchema, {
            NODE_ENV: "development",
            APP_ORIGIN: "http://localhost:5174/",
            AUTH_URL: "http://localhost:3001/",
            API_URL: "http://localhost:3000/",
            LOGIN_URL: "http://localhost:3001/auth",
        })

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.APP_ORIGIN).toBe("http://localhost:5174")
        }
    })

    it("accepts test runtime mode for local E2E environments", () => {
        const result = safeParseSchema(serverEnvSchema, {
            NODE_ENV: "test",
            APP_ORIGIN: "http://localhost:5175/",
            AUTH_URL: "http://localhost:4100/",
            API_URL: "http://localhost:4100/",
            LOGIN_URL: "http://localhost:5175/sign-in",
        })

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.APP_ORIGIN).toBe("http://localhost:5175")
        }
    })
})
