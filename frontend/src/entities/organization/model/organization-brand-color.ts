import type { CSSProperties } from "react"
import * as v from "valibot"

export const DEFAULT_ORGANIZATION_BRAND_COLOR = "#0103B8"

export const ORGANIZATION_BRAND_COLOR_OPTIONS = [
    { id: "#0103B8", name: "Quest Blue" },
    { id: "#CC7D5E", name: "Copper Clay" },
    { id: "#5E6AD2", name: "Cosmic Iris" },
    { id: "#3183D8", name: "Signal Azure" },
    { id: "#3D755D", name: "Pine Harbor" },
    { id: "#FF66AD", name: "Neon Bloom" },
    { id: "#333333", name: "Graphite" },
] as const

export type OrganizationBrandColor = (typeof ORGANIZATION_BRAND_COLOR_OPTIONS)[number]["id"]

export const organizationBrandColorSchema = v.picklist(
    ORGANIZATION_BRAND_COLOR_OPTIONS.map((option) => option.id) as [
        OrganizationBrandColor,
        ...OrganizationBrandColor[],
    ]
)

export interface OrganizationBrandColorCssVariables extends CSSProperties {
    "--color-ds-accent-100"?: string
    "--color-ds-accent-150"?: string
    "--color-ds-accent-200"?: string
    "--color-ds-accent-300"?: string
    "--color-ds-accent-400"?: string
    "--color-ds-accent-500"?: string
    "--color-ds-accent-600"?: string
    "--color-ds-accent-700"?: string
    "--color-ds-accent-750"?: string
    "--color-ds-accent-800"?: string
    "--color-ds-accent-900"?: string
    "--color-ds-accent-1000"?: string
    "--color-ds-accent"?: string
    "--color-ds-accent-hover"?: string
    "--color-ds-accent-active"?: string
    "--color-ds-accent-text"?: string
    "--color-ds-accent-ring"?: string
    "--color-ds-link"?: string
    "--color-ds-link-hover"?: string
}

export function isOrganizationBrandColor(
    value: string | null | undefined
): value is OrganizationBrandColor {
    return v.safeParse(organizationBrandColorSchema, value).success
}

export function normalizeOrganizationBrandColor(value: unknown): OrganizationBrandColor {
    const result = v.safeParse(organizationBrandColorSchema, value)
    return result.success ? result.output : DEFAULT_ORGANIZATION_BRAND_COLOR
}

export function getOrganizationBrandColorOption(value: unknown) {
    const brandColor = normalizeOrganizationBrandColor(value)
    return (
        ORGANIZATION_BRAND_COLOR_OPTIONS.find((option) => option.id === brandColor) ??
        ORGANIZATION_BRAND_COLOR_OPTIONS[0]
    )
}

export function createOrganizationBrandColorCssVariables(
    value: unknown
): OrganizationBrandColorCssVariables {
    const brandColor = normalizeOrganizationBrandColor(value)
    const hoverColor =
        brandColor === "#333333"
            ? `color-mix(in oklch, ${brandColor} 86%, white)`
            : `color-mix(in oklch, ${brandColor} 90%, black)`
    const activeColor =
        brandColor === "#333333"
            ? `color-mix(in oklch, ${brandColor} 76%, white)`
            : `color-mix(in oklch, ${brandColor} 82%, black)`

    return {
        "--color-ds-accent-100": `color-mix(in oklch, ${brandColor} 8%, white)`,
        "--color-ds-accent-150": `color-mix(in oklch, ${brandColor} 12%, white)`,
        "--color-ds-accent-200": `color-mix(in oklch, ${brandColor} 16%, white)`,
        "--color-ds-accent-300": `color-mix(in oklch, ${brandColor} 24%, white)`,
        "--color-ds-accent-400": `color-mix(in oklch, ${brandColor} 36%, white)`,
        "--color-ds-accent-500": `color-mix(in oklch, ${brandColor} 52%, white)`,
        "--color-ds-accent-600": `color-mix(in oklch, ${brandColor} 72%, white)`,
        "--color-ds-accent-700": brandColor,
        "--color-ds-accent-750": hoverColor,
        "--color-ds-accent-800": activeColor,
        "--color-ds-accent-900": `color-mix(in oklch, ${brandColor} 68%, black)`,
        "--color-ds-accent-1000": `color-mix(in oklch, ${brandColor} 52%, black)`,
        "--color-ds-accent": "var(--color-ds-accent-700)",
        "--color-ds-accent-hover": "var(--color-ds-accent-750)",
        "--color-ds-accent-active": "var(--color-ds-accent-800)",
        "--color-ds-accent-text": "var(--color-ds-accent-700)",
        "--color-ds-accent-ring": "var(--color-ds-accent-700)",
        "--color-ds-link": "var(--color-ds-accent-700)",
        "--color-ds-link-hover": "var(--color-ds-accent-750)",
    }
}

export function createOrganizationBrandColorStyle(
    value: unknown
): OrganizationBrandColorCssVariables {
    return createOrganizationBrandColorCssVariables(value)
}
