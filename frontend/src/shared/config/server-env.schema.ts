import * as v from "valibot"

const requiredUrl = v.pipe(v.string(), v.url(), v.transform(stripTrailingSlash))
const runtimeModeSchema = v.picklist(["development", "production", "test"])

export const serverEnvSchema = v.pipe(
    v.object({
        NODE_ENV: runtimeModeSchema,
        APP_ORIGIN: v.pipe(v.string(), v.url()),
        AUTH_URL: requiredUrl,
        API_URL: requiredUrl,
        LOGIN_URL: requiredUrl,
    }),
    v.forward(
        v.check(
            (env) => env.NODE_ENV !== "production" || usesProtocol(env.APP_ORIGIN, "https:"),
            "APP_ORIGIN must use HTTPS in production"
        ),
        ["APP_ORIGIN"]
    ),
    v.forward(
        v.check((env) => {
            const url = new URL(env.APP_ORIGIN)
            const hasPath = url.pathname.replace(/\/+$/, "") !== ""
            return !(url.username || url.password || hasPath || url.search || url.hash)
        }, "APP_ORIGIN must be an origin without path, search, hash, or credentials"),
        ["APP_ORIGIN"]
    ),
    v.forward(
        v.check(
            (env) => env.NODE_ENV !== "production" || usesProtocol(env.AUTH_URL, "https:"),
            "AUTH_URL must use HTTPS in production"
        ),
        ["AUTH_URL"]
    ),
    v.forward(
        v.check(
            (env) => env.NODE_ENV !== "production" || usesProtocol(env.API_URL, "https:"),
            "API_URL must use HTTPS in production"
        ),
        ["API_URL"]
    ),
    v.forward(
        v.check(
            (env) => env.NODE_ENV !== "production" || usesProtocol(env.LOGIN_URL, "https:"),
            "LOGIN_URL must use HTTPS in production"
        ),
        ["LOGIN_URL"]
    ),
    v.transform((env) => ({
        ...env,
        APP_ORIGIN: new URL(env.APP_ORIGIN).origin,
    }))
)

function stripTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "")
}

function usesProtocol(value: string, protocol: "https:"): boolean {
    return new URL(value).protocol === protocol
}
