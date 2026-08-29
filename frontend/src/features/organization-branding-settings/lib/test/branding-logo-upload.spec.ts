import { describe, expect, it } from "bun:test"
import {
    BRANDING_LOGO_UPLOAD_CONFIG,
    getBrandingLogoFileValidationError,
} from "../branding-logo-upload"

describe("branding logo upload validation", () => {
    it("rejects unsupported image subtypes before previewing", () => {
        const file = new File(["<svg />"], "logo.svg", { type: "image/svg+xml" })

        expect(getBrandingLogoFileValidationError(file)).toBe(
            "Logo must be a PNG, JPEG, or WEBP image."
        )
    })

    it("rejects oversized files before previewing", () => {
        const file = new File(
            [new Uint8Array(BRANDING_LOGO_UPLOAD_CONFIG.maxSize + 1)],
            "logo.png",
            { type: "image/png" }
        )

        expect(getBrandingLogoFileValidationError(file)).toBe("Logo must be 5 MB or smaller.")
    })

    it("accepts supported files within the size limit", () => {
        const file = new File(["logo"], "logo.webp", { type: "image/webp" })

        expect(getBrandingLogoFileValidationError(file)).toBeNull()
    })
})
