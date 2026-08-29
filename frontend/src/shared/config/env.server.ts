import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { serverEnvSchema } from "./server-env.schema"

function validateServerEnv() {
    const result = safeParseSchema(serverEnvSchema, {
        NODE_ENV: process.env.NODE_ENV,
        APP_ORIGIN: process.env.APP_ORIGIN,
        AUTH_URL: process.env.AUTH_URL,
        API_URL: process.env.API_URL,
        LOGIN_URL: process.env.LOGIN_URL,
    })

    if (!result.success) {
        const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`)
        throw new Error(`Server environment validation failed:\n${errors.join("\n")}`)
    }

    return result.data
}

export const serverEnv = validateServerEnv()
