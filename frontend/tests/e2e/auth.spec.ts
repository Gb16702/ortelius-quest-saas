import type { Page } from "@playwright/test"
import { E2E_AUTH_ACCOUNTS } from "./fixtures/api.fixture"
import { expect, test } from "./fixtures/auth.fixture"
import { E2E_AUTH_PASSWORD, E2E_ORG_SLUG } from "./helpers/e2e-app"

test.describe("auth and organization navigation @smoke @critical", () => {
    test("signs in with E2E credentials and lands on the active org dashboard", async ({
        page,
    }) => {
        await page.goto("/sign-in")

        await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible()
        await page.getByLabel("Email").fill(E2E_AUTH_ACCOUNTS.admin.email)
        await page.getByRole("textbox", { name: "Password" }).fill(E2E_AUTH_PASSWORD)
        await page.getByRole("button", { name: "Sign in" }).click()

        await expect(page).toHaveURL(new RegExp(`/org/${E2E_ORG_SLUG}/dashboard/?$`))
    })

    test("keeps invalid credentials on sign-in with an inline error", async ({ page }) => {
        await page.goto("/sign-in")

        await page.getByLabel("Email").fill(E2E_AUTH_ACCOUNTS.admin.email)
        await page.getByRole("textbox", { name: "Password" }).fill("wrong-password")
        await page.getByRole("button", { name: "Sign in" }).click()

        await expect(page.getByRole("alert")).toContainText("Invalid email or password")
        await expect(page).toHaveURL(/\/sign-in$/)
    })

    test("redirects unauthenticated protected routes and clears a shared session on logout", async ({
        page,
        adminPage,
    }) => {
        await page.goto(`/org/${E2E_ORG_SLUG}/requests`)
        await expect(page).toHaveURL(/\/sign-in\?redirect=/)
        await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible()

        const secondTab = await adminPage.context().newPage()
        await secondTab.goto(`/org/${E2E_ORG_SLUG}/requests`)
        await expect(secondTab).toHaveURL(new RegExp(`/org/${E2E_ORG_SLUG}/requests/?$`))

        await adminPage.goto("/auth/logout")
        await expect(adminPage).toHaveURL(/\/sign-in$/)

        await secondTab.goto(`/org/${E2E_ORG_SLUG}/requests`)
        await expect(secondTab).toHaveURL(/\/sign-in\?redirect=/)
        await secondTab.close()
    })

    test("allows admin management navigation and redirects members away from admin-only areas", async ({
        adminPage,
        memberPage,
    }) => {
        await adminPage.goto(`/org/${E2E_ORG_SLUG}/team`)
        await expect(adminPage.getByRole("heading", { name: "Members" })).toBeVisible()

        await gotoAllowingReactRouterAbort(adminPage, `/org/${E2E_ORG_SLUG}/team/invitations`)
        await expect(adminPage.getByRole("heading", { name: "Invitations" })).toBeVisible()

        await gotoAllowingReactRouterAbort(memberPage, `/org/${E2E_ORG_SLUG}/team/invitations`)
        await expect(memberPage).toHaveURL(/\/me\/requests/)
    })
})

async function gotoAllowingReactRouterAbort(page: Page, url: string) {
    try {
        await page.goto(url)
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("net::ERR_ABORTED")) {
            throw error
        }
    }
}
