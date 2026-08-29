import { describe, expect, it } from "bun:test"
import { parseOrganizationLayoutShowcaseResponse } from "../organization-showcase.schema"

describe("parseOrganizationLayoutShowcaseResponse", () => {
    it("normalizes layout organization data with route slug fallback", () => {
        expect(
            parseOrganizationLayoutShowcaseResponse("route-slug", {
                success: true,
                data: {
                    organization: {
                        id: "org-1",
                        name: "Acme Freight",
                        logo: null,
                        brandColor: "#0103B8",
                        tagline: null,
                    },
                },
            })
        ).toEqual({
            id: "org-1",
            name: "Acme Freight",
            slug: "route-slug",
            logo: null,
            brandColor: "#0103B8",
            font: "geist",
            tagline: null,
        })
    })

    it("normalizes layout organization font ids", () => {
        expect(
            parseOrganizationLayoutShowcaseResponse("route-slug", {
                success: true,
                data: {
                    organization: {
                        id: "org-1",
                        name: "Acme Freight",
                        logo: null,
                        brandColor: "#0103B8",
                        font: "manrope",
                        tagline: null,
                    },
                },
            })
        ).toMatchObject({
            font: "manrope",
        })
    })

    it("throws when success payload omits the layout organization", () => {
        expect(() =>
            parseOrganizationLayoutShowcaseResponse("missing-org", {
                success: true,
                data: {},
            })
        ).toThrow("data.organization")
    })
})
