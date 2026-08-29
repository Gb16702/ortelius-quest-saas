import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { organizationInfoSchema } from "../../model/organization-info.schema"
import { createOrganization } from "../../model/test/organization.factory"
import { organizationInfoKeys } from "../organization-info.query"
import {
    organizationBillingSettingsQueryOptions,
    organizationBrandingSettingsQueryOptions,
    organizationBusinessSettingsQueryOptions,
    organizationSettingsKeys,
    toOrganizationBillingSettings,
    toOrganizationBrandingSettings,
    toOrganizationBusinessSettings,
} from "../organization-settings.query"

describe("organization settings queries", () => {
    it("uses the shared organization info cache entry for every settings owner", () => {
        expect(organizationSettingsKeys.detail("org-1")).toEqual(
            organizationInfoKeys.detail("org-1")
        )
        expect([...organizationBrandingSettingsQueryOptions("org-1").queryKey]).toEqual([
            ...organizationInfoKeys.detail("org-1"),
        ])
        expect([...organizationBusinessSettingsQueryOptions("org-1").queryKey]).toEqual([
            ...organizationInfoKeys.detail("org-1"),
        ])
        expect([...organizationBillingSettingsQueryOptions("org-1").queryKey]).toEqual([
            ...organizationInfoKeys.detail("org-1"),
        ])
    })

    it("narrows the broad organization payload into settings read models", () => {
        const organization = parseSchema(
            organizationInfoSchema,
            createOrganization({
                name: "Acme Freight",
                slug: "acme",
                logo: "https://cdn.example.test/acme.png",
                tagline: "Freight without friction",
                overview: "Moving cargo across the region.",
                website: "https://acme.example",
                taxIdType: "BE_VAT",
                taxIdNumber: "BE0123456789",
                emailIntakeEnabled: true,
                brandColor: "#3183D8",
                font: "inter",
            })
        )

        expect(toOrganizationBrandingSettings(organization)).toEqual({
            id: organization.id,
            name: "Acme Freight",
            slug: "acme",
            logo: "https://cdn.example.test/acme.png",
            tagline: "Freight without friction",
            overview: "Moving cargo across the region.",
            website: "https://acme.example",
            brandColor: "#3183D8",
            font: "inter",
        })
        expect(toOrganizationBusinessSettings(organization)).toEqual({
            id: organization.id,
            slug: "acme",
            emailIntakeEnabled: true,
        })
        expect(toOrganizationBillingSettings(organization)).toEqual({
            id: organization.id,
            taxIdType: "BE_VAT",
            taxIdNumber: "BE0123456789",
        })
    })
})
