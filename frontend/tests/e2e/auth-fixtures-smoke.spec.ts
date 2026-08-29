import type { Page } from "@playwright/test"
import {
    buildRoleAccessToken,
    E2E_AUTH_ACCOUNTS,
    E2E_AUTH_COOKIE_NAME,
    E2E_AUTH_LOCAL_STORAGE_ROLE_KEY,
    E2E_AUTH_LOCAL_STORAGE_USER_ID_KEY,
    type E2ERole,
    getE2EBaseURL,
} from "./fixtures/api.fixture"
import { expect, test } from "./fixtures/auth.fixture"

test("auth role fixtures @smoke create admin, member, and guest pages", async ({
    adminPage,
    memberPage,
    guestPage,
}) => {
    await expectRoleStorage(adminPage, "admin")
    await expectRoleStorage(memberPage, "member")
    await expectRoleStorage(guestPage, "guest")

    await expectRelativeNavigation(adminPage, "admin")
    await expectRelativeNavigation(memberPage, "member")
    await expectRelativeNavigation(guestPage, "guest")
})

async function expectRoleStorage(page: Page, role: E2ERole) {
    const storageState = await page.context().storageState()
    const appOrigin = new URL(getE2EBaseURL()).origin

    const authCookie = storageState.cookies.find((cookie) => cookie.name === E2E_AUTH_COOKIE_NAME)
    expect(authCookie?.value).toBe(buildRoleAccessToken(role))

    const originState = storageState.origins.find((origin) => origin.origin === appOrigin)
    const localStorage = new Map(
        originState?.localStorage.map((entry) => [entry.name, entry.value]) ?? []
    )

    expect(localStorage.get(E2E_AUTH_LOCAL_STORAGE_ROLE_KEY)).toBe(role)
    expect(localStorage.get(E2E_AUTH_LOCAL_STORAGE_USER_ID_KEY)).toBe(
        E2E_AUTH_ACCOUNTS[role].userId
    )
}

async function expectRelativeNavigation(page: Page, role: E2ERole) {
    await page.context().route("**/__e2e-role-fixture-smoke", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: `<main>${role} fixture page</main>`,
        })
    })

    await page.goto("/__e2e-role-fixture-smoke")

    await expect(page.getByText(`${role} fixture page`)).toBeVisible()
    expect(new URL(page.url()).origin).toBe(new URL(getE2EBaseURL()).origin)
}
