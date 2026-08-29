import * as v from "valibot"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

const optionalString = v.pipe(
    v.optional(v.string(), ""),
    v.transform((value) => (value === "" ? undefined : value))
)

const optionalUrl = v.pipe(
    v.optional(v.string(), ""),
    v.transform((value) => (value === "" ? undefined : value)),
    v.optional(v.pipe(v.string(), v.url()))
)

const requiredUrl = v.pipe(v.string(), v.url(), v.transform(stripTrailingSlash))

interface PublicEnvSchemaOptions {
    isProduction: boolean
}

export function createPublicEnvSchema({ isProduction }: PublicEnvSchemaOptions) {
    return v.object({
        API_URL: productionHttpsUrl("API_URL", isProduction),
        WS_URL: productionWssUrl(isProduction),
        PORTAL_ACCOUNT_URL: productionHttpsUrl("PORTAL_ACCOUNT_URL", isProduction),
        UMAMI_URL: optionalProductionHttpsUrl("UMAMI_URL", isProduction),
        UMAMI_WEBSITE_ID: optionalString,
        STRIPE_PUBLISHABLE_KEY: optionalString,
        GMAPS_KEY: optionalString,
        E2E_EXPOSE_PC: v.optional(
            v.pipe(
                v.unknown(),
                v.transform((value) => value === "true"),
                v.boolean()
            ),
            false
        ),
    })
}

export const publicEnvSchema = createPublicEnvSchema({
    isProduction: readImportMetaEnvBoolean("PROD"),
})

function stripTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "")
}

function usesProtocol(value: string, protocol: "https:" | "wss:"): boolean {
    try {
        return new URL(value).protocol === protocol
    } catch {
        return false
    }
}

function productionHttpsUrl(key: string, isProduction: boolean) {
    return v.pipe(
        requiredUrl,
        v.check(
            (value) => !isProduction || usesProtocol(value, "https:"),
            `${key} must use HTTPS in production`
        )
    )
}

function optionalProductionHttpsUrl(key: string, isProduction: boolean) {
    return v.pipe(
        optionalUrl,
        v.check(
            (value) => !isProduction || value === undefined || usesProtocol(value, "https:"),
            `${key} must use HTTPS in production`
        )
    )
}

function productionWssUrl(isProduction: boolean) {
    return v.pipe(
        requiredUrl,
        v.check(
            (value) => !isProduction || usesProtocol(value, "wss:"),
            "WS_URL must use WSS in production"
        )
    )
}

function validatePublicEnv() {
    const result = safeParseSchema(publicEnvSchema, {
        API_URL: import.meta.env.VITE_API_URL,
        WS_URL: import.meta.env.VITE_WS_URL,
        PORTAL_ACCOUNT_URL: import.meta.env.VITE_PORTAL_ACCOUNT_URL,
        UMAMI_URL: import.meta.env.VITE_UMAMI_URL,
        UMAMI_WEBSITE_ID: import.meta.env.VITE_UMAMI_WEBSITE_ID,
        STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
        GMAPS_KEY: import.meta.env.VITE_GMAPS_KEY,
        E2E_EXPOSE_PC: import.meta.env.VITE_E2E_EXPOSE_PC,
    })

    if (!result.success) {
        const errors = result.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
        )
        throw new Error(`Public environment validation failed:\n${errors.join("\n")}`)
    }

    return result.data
}

export const publicEnv = validatePublicEnv()

function readImportMetaEnvBoolean(key: "DEV" | "PROD"): boolean {
    const value: unknown = import.meta.env[key]
    return value === true || value === "true"
}
