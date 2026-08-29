import type { APIRequestContext } from "@playwright/test"
import {
    buildRoleAccessToken,
    buildRoleHttpHeaders,
    type E2ERole,
} from "../fixtures/api.fixture"

export const E2E_ORG_ID = "e2e-test-org"
export const E2E_ORG_SLUG = process.env.PLAYWRIGHT_E2E_ORG_SLUG ?? "e2e-test-org"
export const E2E_AUTH_PASSWORD = "e2e-test-password"
export const E2E_SHARED_CONVERSATION_ID = "44444444-4444-4444-8444-444444444444"

interface E2EApiOptions {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
    data?: unknown
}

export function getE2EApiBaseURL(): string {
    return process.env.VITE_API_URL ?? process.env.API_URL ?? "http://localhost:4100"
}

export function buildRoleAuthHeaders(role: E2ERole): Record<string, string> {
    return {
        ...buildRoleHttpHeaders(role),
        Authorization: `Bearer ${buildRoleAccessToken(role)}`,
    }
}

export async function fetchE2EApiJson<T>(
    request: APIRequestContext,
    role: E2ERole,
    path: string,
    options: E2EApiOptions = {}
): Promise<T> {
    const response = await request.fetch(`${getE2EApiBaseURL()}${path}`, {
        method: options.method ?? "GET",
        headers: {
            ...buildRoleAuthHeaders(role),
            "Content-Type": "application/json",
        },
        data: options.data,
    })

    if (!response.ok()) {
        throw new Error(
            `E2E API ${options.method ?? "GET"} ${path} failed with ${response.status()}: ${await response.text()}`
        )
    }

    return (await response.json()) as T
}

export function uniqueE2EValue(prefix: string): string {
    return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
}
