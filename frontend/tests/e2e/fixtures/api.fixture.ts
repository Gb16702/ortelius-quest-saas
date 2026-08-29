import { access, mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { test as base, type APIRequestContext } from "@playwright/test"

export type E2ERole = "admin" | "member" | "guest"

export interface E2EAuthAccount {
    role: E2ERole
    userId: string
    email: string
    name: string
}

interface E2EStorageCookie {
    name: string
    value: string
    domain: string
    path: string
    expires: number
    httpOnly: boolean
    secure: boolean
    sameSite: "Strict" | "Lax" | "None"
}

interface E2EStorageState {
    cookies: E2EStorageCookie[]
    origins: Array<{
        origin: string
        localStorage: Array<{ name: string; value: string }>
    }>
}

export interface E2EApiFixture {
    request: APIRequestContext
    accounts: Record<E2ERole, E2EAuthAccount>
    setupRole: (role: E2ERole) => Promise<E2EAuthAccount>
    teardownRole: (role: E2ERole) => Promise<void>
}

export const E2E_ROLES: readonly E2ERole[] = ["admin", "member", "guest"]
export const E2E_AUTH_COOKIE_NAME = "dev_access_token"
export const E2E_AUTH_LOCAL_STORAGE_ROLE_KEY = "ortelius:e2e-role"
export const E2E_AUTH_LOCAL_STORAGE_USER_ID_KEY = "ortelius:e2e-user-id"

export const E2E_AUTH_ACCOUNTS = {
    admin: {
        role: "admin",
        userId: "e2e-admin-user-id",
        email: "e2e-admin@test.local",
        name: "E2E Admin",
    },
    member: {
        role: "member",
        userId: "e2e-member-user-id",
        email: "e2e-member@test.local",
        name: "E2E Member",
    },
    guest: {
        role: "guest",
        userId: "e2e-guest-user-id",
        email: "e2e-guest@test.local",
        name: "E2E Guest",
    },
} satisfies Record<E2ERole, E2EAuthAccount>

export const E2E_AUTH_DIR = fileURLToPath(new URL("../.auth/", import.meta.url))

export const E2E_AUTH_STATE_PATHS = {
    admin: fileURLToPath(new URL("../.auth/admin.json", import.meta.url)),
    member: fileURLToPath(new URL("../.auth/member.json", import.meta.url)),
    guest: fileURLToPath(new URL("../.auth/guest.json", import.meta.url)),
} satisfies Record<E2ERole, string>

export function getE2EBaseURL(): string {
    return process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5174"
}

export function buildRoleAccessToken(role: E2ERole): string {
    const envKey = `PLAYWRIGHT_E2E_${role.toUpperCase()}_TOKEN`
    return process.env[envKey] ?? `test-bypass:${E2E_AUTH_ACCOUNTS[role].userId}`
}

export function buildRoleHttpHeaders(role: E2ERole): Record<string, string> {
    return { "X-Test-User-Id": E2E_AUTH_ACCOUNTS[role].userId }
}

export function buildRoleStorageState(
    role: E2ERole,
    baseURL = getE2EBaseURL()
): E2EStorageState {
    const url = new URL(baseURL)
    const account = E2E_AUTH_ACCOUNTS[role]

    return {
        cookies: [
            {
                name: E2E_AUTH_COOKIE_NAME,
                value: buildRoleAccessToken(role),
                domain: url.hostname,
                path: "/",
                expires: -1,
                httpOnly: true,
                secure: url.protocol === "https:",
                sameSite: "Lax",
            },
        ],
        origins: [
            {
                origin: url.origin,
                localStorage: [
                    { name: E2E_AUTH_LOCAL_STORAGE_ROLE_KEY, value: role },
                    { name: E2E_AUTH_LOCAL_STORAGE_USER_ID_KEY, value: account.userId },
                ],
            },
        ],
    }
}

export async function writeRoleStorageState(role: E2ERole): Promise<void> {
    await mkdir(E2E_AUTH_DIR, { recursive: true })
    await writeFile(
        E2E_AUTH_STATE_PATHS[role],
        `${JSON.stringify(buildRoleStorageState(role), null, 2)}\n`,
        "utf8"
    )
}

export async function writeAllRoleStorageStates(): Promise<void> {
    await Promise.all(E2E_ROLES.map((role) => writeRoleStorageState(role)))
}

async function ensureRoleStorageState(role: E2ERole): Promise<void> {
    try {
        await access(E2E_AUTH_STATE_PATHS[role])
    } catch {
        await writeRoleStorageState(role)
    }
}

async function setupRole(role: E2ERole): Promise<E2EAuthAccount> {
    await ensureRoleStorageState(role)
    return E2E_AUTH_ACCOUNTS[role]
}

async function teardownRole(role: E2ERole): Promise<void> {
    // Role setup currently uses deterministic bypass storage state only.
    // Keep the hook explicit so future backend-owned records have one cleanup point.
    void role
}

export const test = base.extend<{ e2eApi: E2EApiFixture }>({
    e2eApi: async ({ request }, use) => {
        await use({
            request,
            accounts: E2E_AUTH_ACCOUNTS,
            setupRole,
            teardownRole,
        })
    },
})
