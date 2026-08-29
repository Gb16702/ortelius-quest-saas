import type { Locator, Page } from "@playwright/test"
import { E2E_AUTH_ACCOUNTS } from "./fixtures/api.fixture"
import { expect, test } from "./fixtures/auth.fixture"
import { E2E_ORG_SLUG, uniqueE2EValue } from "./helpers/e2e-app"

test.describe("members invite and role management @critical", () => {
    test("invites members, blocks duplicate rows, persists role changes, and guards admin-only pages", async ({
        adminPage,
        memberPage,
    }) => {
        const inviteEmail = `${uniqueE2EValue("invite")}@example.test`
        const secondInviteEmail = `${uniqueE2EValue("invite-alt")}@example.test`

        await adminPage.goto(`/org/${E2E_ORG_SLUG}/team`)
        await expect(adminPage.getByRole("heading", { name: "Members" })).toBeVisible()
        await expect(
            adminPage.getByRole("row", { name: new RegExp(E2E_AUTH_ACCOUNTS.member.email) })
        ).toBeVisible()

        await adminPage.locator("header").getByRole("button", { name: "Invite members" }).click()
        const inviteDialog = adminPage.getByRole("dialog", { name: "Invite members" })
        await expect(inviteDialog).toBeVisible()

        await inviteDialog.getByPlaceholder("colleague@company.com").first().fill(inviteEmail)
        await inviteDialog.getByPlaceholder("colleague@company.com").first().press("Enter")
        await inviteDialog.getByPlaceholder("colleague@company.com").nth(1).fill(inviteEmail)
        await inviteDialog.getByRole("button", { name: "Send Invitations" }).click()

        await expect(inviteDialog.getByText("This email is already in the list").first()).toBeVisible()

        await inviteDialog
            .getByPlaceholder("colleague@company.com")
            .nth(1)
            .fill(secondInviteEmail)
        await inviteDialog.getByRole("button", { name: "Send Invitations" }).click()
        await expect(inviteDialog).not.toBeVisible()

        await gotoAllowingReactRouterAbort(adminPage, `/org/${E2E_ORG_SLUG}/team/invitations`)
        await expect(adminPage.getByRole("heading", { name: "Invitations" })).toBeVisible()
        await expect(adminPage.getByRole("row", { name: new RegExp(inviteEmail) })).toBeVisible()

        await adminPage.goto(`/org/${E2E_ORG_SLUG}/team`)
        const memberRow = adminPage.getByRole("row", {
            name: new RegExp(E2E_AUTH_ACCOUNTS.member.email),
        })
        await changeMemberRole(adminPage, memberRow, "Member")
        await expect(memberRow.getByRole("cell", { name: "member", exact: true })).toBeVisible()

        await changeMemberRole(adminPage, memberRow, "Admin")
        await expect(memberRow.getByRole("cell", { name: "admin", exact: true })).toBeVisible()

        await changeMemberRole(adminPage, memberRow, "Member")
        await expect(memberRow.getByRole("cell", { name: "member", exact: true })).toBeVisible()

        const adminRow = adminPage.getByRole("row", {
            name: new RegExp(E2E_AUTH_ACCOUNTS.admin.email),
        })
        await adminRow.getByRole("button", { name: "Open menu" }).click()
        await expect(adminPage.getByRole("menuitem", { name: "Edit role" })).not.toBeVisible()

        await gotoAllowingReactRouterAbort(memberPage, `/org/${E2E_ORG_SLUG}/team/invitations`)
        await expect(memberPage).toHaveURL(/\/me\/requests/)
    })
})

async function changeMemberRole(page: Page, memberRow: Locator, role: "Admin" | "Member") {
    await memberRow.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("menuitem", { name: "Edit role" }).click()

    const editRoleDialog = page.getByRole("dialog", { name: "Edit Role" })
    await expect(editRoleDialog).toBeVisible()

    const roleRadio = editRoleDialog.getByRole("radio", { name: role })
    if ((await roleRadio.getAttribute("aria-checked")) === "true") {
        await editRoleDialog.getByRole("button", { name: "Close" }).click()
        await expect(editRoleDialog).not.toBeVisible()
        return
    }

    await roleRadio.click()
    await editRoleDialog.getByRole("button", { name: "Update Role" }).click()
    await expect(editRoleDialog).not.toBeVisible()
}

async function gotoAllowingReactRouterAbort(page: Page, url: string) {
    try {
        await page.goto(url)
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("net::ERR_ABORTED")) {
            throw error
        }
    }
}
