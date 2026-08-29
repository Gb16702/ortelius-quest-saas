import type { CSSProperties } from "react"
import * as v from "valibot"

export const ORGANIZATION_FONT_IDS = [
    "geist",
    "inter",
    "roboto",
    "ibm-plex-sans",
    "manrope",
    "plus-jakarta-sans",
] as const

export const DEFAULT_ORGANIZATION_FONT_ID = "geist"

export const ORGANIZATION_FONT_STYLESHEET_LINK_ID = "organization-font-stylesheet"

export type OrganizationFontId = (typeof ORGANIZATION_FONT_IDS)[number]

export interface OrganizationFontOption {
    id: OrganizationFontId
    name: string
    fontFamily: string
    letterSpacing: string
    stylesheetHref: string
}

export interface OrganizationFontStyle extends CSSProperties {
    [key: `--${string}`]: string | number | undefined
}

const fallbackFontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'

export const ORGANIZATION_FONT_OPTIONS: OrganizationFontOption[] = [
    {
        id: "geist",
        name: "Geist",
        fontFamily: `"Geist", "Inter", ${fallbackFontFamily}`,
        letterSpacing: "-0.02em",
        stylesheetHref: "/assets/fonts/organization/geist/font.css",
    },
    {
        id: "inter",
        name: "Inter",
        fontFamily: `"Inter", "Geist", ${fallbackFontFamily}`,
        letterSpacing: "-0.02em",
        stylesheetHref: "/assets/fonts/organization/inter/font.css",
    },
    {
        id: "roboto",
        name: "Roboto",
        fontFamily: `"Roboto", "Inter", ${fallbackFontFamily}`,
        letterSpacing: "normal",
        stylesheetHref: "/assets/fonts/organization/roboto/font.css",
    },
    {
        id: "ibm-plex-sans",
        name: "IBM Plex Sans",
        fontFamily: `"IBM Plex Sans", "Inter", ${fallbackFontFamily}`,
        letterSpacing: "normal",
        stylesheetHref: "/assets/fonts/organization/ibm-plex-sans/font.css",
    },
    {
        id: "manrope",
        name: "Manrope",
        fontFamily: `"Manrope", "Inter", ${fallbackFontFamily}`,
        letterSpacing: "normal",
        stylesheetHref: "/assets/fonts/organization/manrope/font.css",
    },
    {
        id: "plus-jakarta-sans",
        name: "Plus Jakarta Sans",
        fontFamily: `"Plus Jakarta Sans", "Inter", ${fallbackFontFamily}`,
        letterSpacing: "normal",
        stylesheetHref: "/assets/fonts/organization/plus-jakarta-sans/font.css",
    },
]

const organizationFontOptionById = new Map(
    ORGANIZATION_FONT_OPTIONS.map((option) => [option.id, option])
)

export const organizationFontIdSchema = v.picklist(ORGANIZATION_FONT_IDS)

export function normalizeOrganizationFont(value: unknown): OrganizationFontId {
    const result = v.safeParse(organizationFontIdSchema, value)

    return result.success ? result.output : DEFAULT_ORGANIZATION_FONT_ID
}

export function getOrganizationFontOption(value: unknown): OrganizationFontOption {
    return (
        organizationFontOptionById.get(normalizeOrganizationFont(value)) ??
        ORGANIZATION_FONT_OPTIONS[0]
    )
}

export function createOrganizationFontCssVariables(value: unknown): OrganizationFontStyle {
    const option = getOrganizationFontOption(value)

    return {
        "--font-sans": option.fontFamily,
        "--font-sans-letter-spacing": option.letterSpacing,
    }
}

export function createOrganizationFontStyle(value: unknown): OrganizationFontStyle {
    return {
        ...createOrganizationFontCssVariables(value),
        fontFamily: "var(--font-sans)",
        letterSpacing: "var(--font-sans-letter-spacing)",
    }
}

export function getOrganizationFontStylesheetHref(value: unknown): string {
    return getOrganizationFontOption(value).stylesheetHref
}
