import type { Browser, BrowserContextOptions, Page } from "@playwright/test"
import {
    buildRoleHttpHeaders,
    E2E_AUTH_STATE_PATHS,
    type E2EApiFixture,
    type E2ERole,
    getE2EBaseURL,
    test as apiTest,
} from "./api.fixture"

interface AuthFixtures {
    adminPage: Page
    memberPage: Page
    guestPage: Page
}

interface RolePageFixtureArgs {
    browser: Browser
    baseURL: string | undefined
    contextOptions: BrowserContextOptions
    e2eApi: E2EApiFixture
    permissions: string[] | undefined
}

async function useRolePage(
    { browser, baseURL, contextOptions, e2eApi, permissions }: RolePageFixtureArgs,
    role: E2ERole,
    use: (page: Page) => Promise<void>
) {
    await e2eApi.setupRole(role)
    const roleHeaders = buildRoleHttpHeaders(role)
    const context = await browser.newContext({
        ...contextOptions,
        baseURL: baseURL ?? contextOptions.baseURL ?? getE2EBaseURL(),
        permissions: permissions ?? contextOptions.permissions,
        storageState: E2E_AUTH_STATE_PATHS[role],
        extraHTTPHeaders: {
            ...contextOptions.extraHTTPHeaders,
            ...roleHeaders,
        },
    })
    const page = await context.newPage()

    try {
        await use(page)
    } finally {
        await context.close()
        await e2eApi.teardownRole(role)
    }
}

export const test = apiTest.extend<AuthFixtures>({
    adminPage: async ({ browser, baseURL, contextOptions, e2eApi, permissions }, use) => {
        await useRolePage({ browser, baseURL, contextOptions, e2eApi, permissions }, "admin", use)
    },
    memberPage: async ({ browser, baseURL, contextOptions, e2eApi, permissions }, use) => {
        await useRolePage({ browser, baseURL, contextOptions, e2eApi, permissions }, "member", use)
    },
    guestPage: async ({ browser, baseURL, contextOptions, e2eApi, permissions }, use) => {
        await useRolePage({ browser, baseURL, contextOptions, e2eApi, permissions }, "guest", use)
    },
})

export { expect } from "@playwright/test"
