import { afterAll, afterEach, describe, expect, it } from "bun:test"

const publicEnvDefaults = {
    NODE_ENV: "development",
    VITE_API_URL: "https://api.example.test",
    VITE_PORTAL_ACCOUNT_URL: "https://portal.example.test",
    VITE_WS_URL: "wss://ws.example.test",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(publicEnvDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(publicEnvDefaults)) {
    process.env[key] = value
}

const [{ screen }, { renderWithProviders }, { LegalPublicHeader }] = await Promise.all([
    import("@testing-library/react"),
    import("@/shared/test/render/render-with-providers"),
    import("../legal-public-header"),
    import("@/shared/lib/i18n/marketing"),
])

afterEach(() => {
    localStorage.clear()
    document.body.innerHTML = ""
})

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

describe("LegalPublicHeader", () => {
    it("clears persisted request and checkout state before logout", async () => {
        localStorage.setItem("send-request-data", "draft")
        localStorage.setItem("ortelius_checkout", "checkout")
        localStorage.setItem("ortelius_billing_period", "yearly")
        localStorage.setItem("unrelated", "keep")

        const { user } = renderWithProviders(
            <LegalPublicHeader
                navLang="en"
                session={{
                    user: {
                        id: "user_1",
                        email: "user@example.test",
                        name: "User",
                        image: null,
                    },
                }}
                activeOrgSlug="acme"
                headerBg="bg-ds-surface"
            />
        )

        const signOutLinks = screen.getAllByRole("link", { name: "Sign out" })
        const desktopSignOutLink = signOutLinks.at(-1)
        if (!desktopSignOutLink) {
            throw new Error("Expected legal header sign out link")
        }
        desktopSignOutLink.addEventListener("click", (event) => event.preventDefault(), {
            once: true,
        })

        await user.click(desktopSignOutLink)

        expect(localStorage.getItem("send-request-data")).toBeNull()
        expect(localStorage.getItem("ortelius_checkout")).toBeNull()
        expect(localStorage.getItem("ortelius_billing_period")).toBeNull()
        expect(localStorage.getItem("unrelated")).toBe("keep")
    })
})
