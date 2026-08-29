import { serverEnv } from "@/shared/config/env.server"

interface E2ELoginInput {
    email: string
    password: string
}

type E2ELoginResult = { ok: true; accessToken: string } | { ok: false; error: string }

const E2E_AUTH_PASSWORD = "e2e-test-password"

const E2E_AUTH_ACCOUNTS_BY_EMAIL = new Map<string, { userId: string }>([
    ["e2e-admin@test.local", { userId: "e2e-admin-user-id" }],
    ["e2e-member@test.local", { userId: "e2e-member-user-id" }],
    ["e2e-guest@test.local", { userId: "e2e-guest-user-id" }],
])

export function resolveE2ELogin({ email, password }: E2ELoginInput): E2ELoginResult | null {
    if (serverEnv.NODE_ENV !== "test") return null

    const account = E2E_AUTH_ACCOUNTS_BY_EMAIL.get(email.trim().toLowerCase())
    if (!account) return null

    if (password !== E2E_AUTH_PASSWORD) {
        return { ok: false, error: "Invalid email or password" }
    }

    return { ok: true, accessToken: `test-bypass:${account.userId}` }
}
