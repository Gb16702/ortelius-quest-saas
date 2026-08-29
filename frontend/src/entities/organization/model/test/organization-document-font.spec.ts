import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { applyOrganizationFontToDocument } from "../organization-document-font"
import { ORGANIZATION_FONT_STYLESHEET_LINK_ID } from "../organization-font"

interface HappyDomSettings {
    disableCSSFileLoading: boolean
    handleDisabledFileLoadingAsSuccess: boolean
}

interface HappyDomWindow extends Window {
    happyDOM?: {
        settings: HappyDomSettings
    }
}

function getOrganizationFontStylesheetLink(): HTMLLinkElement | null {
    const link = document.getElementById(ORGANIZATION_FONT_STYLESHEET_LINK_ID)
    return link instanceof HTMLLinkElement ? link : null
}

function getHappyDomSettings(): HappyDomSettings | null {
    return (window as HappyDomWindow).happyDOM?.settings ?? null
}

describe("organization document font", () => {
    const originalCssFileLoading = getHappyDomSettings()?.disableCSSFileLoading ?? false
    const originalDisabledFileLoadingAsSuccess =
        getHappyDomSettings()?.handleDisabledFileLoadingAsSuccess ?? false

    beforeEach(() => {
        const settings = getHappyDomSettings()
        if (!settings) return

        settings.disableCSSFileLoading = true
        settings.handleDisabledFileLoadingAsSuccess = true
    })

    afterEach(() => {
        document.documentElement.removeAttribute("style")
        getOrganizationFontStylesheetLink()?.remove()

        const settings = getHappyDomSettings()
        if (!settings) return

        settings.disableCSSFileLoading = originalCssFileLoading
        settings.handleDisabledFileLoadingAsSuccess = originalDisabledFileLoadingAsSuccess
    })

    it("sets document font variables and a single runtime stylesheet link", () => {
        const cleanup = applyOrganizationFontToDocument("manrope")
        const link = getOrganizationFontStylesheetLink()

        expect(document.documentElement.style.getPropertyValue("--font-sans")).toContain(
            '"Manrope"'
        )
        expect(document.documentElement.style.getPropertyValue("--font-sans-letter-spacing")).toBe(
            "normal"
        )
        expect(link?.href).toContain("/assets/fonts/organization/manrope/font.css")
        expect(link?.dataset.organizationFontRuntime).toBe("true")

        cleanup()

        expect(document.documentElement.style.getPropertyValue("--font-sans")).toBe("")
        expect(document.documentElement.style.getPropertyValue("--font-sans-letter-spacing")).toBe(
            ""
        )
        expect(getOrganizationFontStylesheetLink()).toBeNull()
    })

    it("sets tighter default tracking for Geist", () => {
        const cleanup = applyOrganizationFontToDocument("geist")

        expect(document.documentElement.style.getPropertyValue("--font-sans")).toContain('"Geist"')
        expect(document.documentElement.style.getPropertyValue("--font-sans-letter-spacing")).toBe(
            "-0.02em"
        )

        cleanup()
    })

    it("reuses an existing route-managed stylesheet link", () => {
        const link = document.createElement("link")
        link.id = ORGANIZATION_FONT_STYLESHEET_LINK_ID
        link.rel = "stylesheet"
        link.href = "/assets/fonts/organization/geist/font.css"
        document.head.appendChild(link)

        const cleanup = applyOrganizationFontToDocument("inter")

        expect(getOrganizationFontStylesheetLink()).toBe(link)
        expect(link.href).toContain("/assets/fonts/organization/inter/font.css")
        expect(document.documentElement.style.getPropertyValue("--font-sans-letter-spacing")).toBe(
            "-0.02em"
        )

        cleanup()

        expect(getOrganizationFontStylesheetLink()).toBe(link)
    })
})
