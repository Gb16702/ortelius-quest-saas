import { describe, expect, it, mock } from "bun:test"
import { screen } from "@testing-library/react"
import type { OrganizationSetupStatus } from "@/entities/organization"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"

mock.module("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, string | number>) => {
            let value = typeof options?.defaultValue === "string" ? options.defaultValue : key
            for (const [optionKey, optionValue] of Object.entries(options ?? {})) {
                value = value.replaceAll(`{{${optionKey}}}`, String(optionValue))
            }
            return value
        },
    }),
}))

const { OrgSidebarSetupChecklist } = await import("../org-sidebar-setup-checklist")

const incompleteStatus = {
    hasLogo: true,
    hasTagline: true,
    hasOverview: true,
    hasServices: false,
    hasCargoTypes: false,
    hasVatConfig: false,
    hasLegalDocuments: false,
    memberCount: 1,
    isComplete: false,
} satisfies OrganizationSetupStatus

const completeStatus = {
    hasLogo: true,
    hasTagline: true,
    hasOverview: true,
    hasServices: true,
    hasCargoTypes: true,
    hasVatConfig: true,
    hasLegalDocuments: true,
    memberCount: 2,
    isComplete: true,
} satisfies OrganizationSetupStatus

function renderChecklist(status: OrganizationSetupStatus = incompleteStatus) {
    return renderWithProviders(
        <OrgSidebarSetupChecklist status={status} organizationSlug="quest" />,
        {
            routerProps: {
                initialEntries: ["/org/quest/dashboard"],
            },
        }
    )
}

describe("OrgSidebarSetupChecklist", () => {
    it("renders compact progress and opens the setup popover", async () => {
        const { user } = renderChecklist()
        const trigger = screen.getByRole("button", { name: "Open getting started checklist" })

        expect(trigger).toHaveTextContent("Getting started")
        expect(trigger).not.toHaveTextContent("38%")

        await user.click(trigger)

        expect(await screen.findByText("3/8 steps completed")).toBeInTheDocument()
        expect(screen.queryByText("38% complete")).not.toBeInTheDocument()
        expect(screen.getByText("Configure services")).toBeInTheDocument()
        expect(
            screen.queryByText("Select the services your organization offers")
        ).not.toBeInTheDocument()
        expect(screen.getByRole("link", { name: /Continue setup/ })).toHaveAttribute(
            "href",
            "/org/quest/settings/business#business"
        )
    })

    it("does not render once the setup is complete", () => {
        renderChecklist(completeStatus)

        expect(
            screen.queryByRole("button", { name: "Open getting started checklist" })
        ).not.toBeInTheDocument()
    })
})
