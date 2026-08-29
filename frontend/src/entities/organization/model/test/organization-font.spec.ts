import { describe, expect, it } from "bun:test"
import {
    createOrganizationFontCssVariables,
    createOrganizationFontStyle,
    DEFAULT_ORGANIZATION_FONT_ID,
    getOrganizationFontOption,
    getOrganizationFontStylesheetHref,
    normalizeOrganizationFont,
    ORGANIZATION_FONT_OPTIONS,
} from "../organization-font"

describe("organization font", () => {
    it("normalizes missing and unknown values to Geist", () => {
        expect(normalizeOrganizationFont(undefined)).toBe(DEFAULT_ORGANIZATION_FONT_ID)
        expect(normalizeOrganizationFont(null)).toBe(DEFAULT_ORGANIZATION_FONT_ID)
        expect(normalizeOrganizationFont("sf-pro")).toBe(DEFAULT_ORGANIZATION_FONT_ID)
    })

    it("keeps the supported font list small and excludes SF Pro", () => {
        expect(ORGANIZATION_FONT_OPTIONS).toHaveLength(6)
        expect(ORGANIZATION_FONT_OPTIONS.map((option) => option.id)).toEqual([
            "geist",
            "inter",
            "roboto",
            "ibm-plex-sans",
            "manrope",
            "plus-jakarta-sans",
        ])
        expect(ORGANIZATION_FONT_OPTIONS.map((option) => option.name)).not.toContain("SF Pro")
    })

    it("creates safe CSS variables from validated font ids", () => {
        expect(getOrganizationFontOption("geist").letterSpacing).toBe("-0.02em")
        expect(getOrganizationFontOption("inter").letterSpacing).toBe("-0.02em")
        expect(getOrganizationFontOption("ibm-plex-sans").name).toBe("IBM Plex Sans")
        expect(createOrganizationFontCssVariables("ibm-plex-sans")).toEqual({
            "--font-sans": expect.stringContaining('"IBM Plex Sans"'),
            "--font-sans-letter-spacing": "normal",
        })
        expect(createOrganizationFontStyle("manrope")).toMatchObject({
            "--font-sans": expect.stringContaining('"Manrope"'),
            "--font-sans-letter-spacing": "normal",
            fontFamily: "var(--font-sans)",
            letterSpacing: "var(--font-sans-letter-spacing)",
        })
    })

    it("resolves a single selected font stylesheet instead of a combined family sheet", () => {
        expect(getOrganizationFontStylesheetHref("ibm-plex-sans")).toBe(
            "/assets/fonts/organization/ibm-plex-sans/font.css"
        )
        expect(getOrganizationFontStylesheetHref("ibm-plex-sans")).not.toContain("inter")
        expect(getOrganizationFontStylesheetHref("unknown")).toBe(
            "/assets/fonts/organization/geist/font.css"
        )
    })
})
