import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { screen, waitFor } from "@testing-library/react"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from "../sidebar"

const SIDEBAR_STORAGE_KEY = "ortelius_sidebar_open"
const originalInnerWidth = window.innerWidth
const originalMatchMedia = window.matchMedia

function installDesktopViewport() {
    window.innerWidth = 1024
    window.matchMedia = (() => ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: false,
        media: "(max-width: 767px)",
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
    })) as typeof window.matchMedia
}

function SidebarHarness() {
    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarContent>Navigation</SidebarContent>
            </Sidebar>
            <SidebarTrigger />
        </SidebarProvider>
    )
}

beforeEach(() => {
    localStorage.clear()
    installDesktopViewport()
})

afterEach(() => {
    localStorage.clear()
    window.innerWidth = originalInnerWidth
    window.matchMedia = originalMatchMedia
})

describe("SidebarProvider", () => {
    it("applies the persisted desktop collapsed state to the visible sidebar", async () => {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, "false")

        renderWithProviders(<SidebarHarness />)

        await waitFor(() => {
            expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
                "data-state",
                "collapsed"
            )
        })
        expect(screen.queryByText("Navigation")).not.toBeInTheDocument()
    })

    it("persists desktop toggles and collapses the visible sidebar", async () => {
        const { user } = renderWithProviders(<SidebarHarness />)

        await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }))

        await waitFor(() => {
            expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("false")
            expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
                "data-state",
                "collapsed"
            )
        })
    })
})
