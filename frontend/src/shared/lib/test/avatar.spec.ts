import { describe, expect, it } from "bun:test"

import { generateAvatarUrl } from "../avatar"

function decodeDataUri(dataUri: string): string {
    const [metadata, payload] = dataUri.split(",", 2)

    if (!metadata || !payload) {
        throw new Error("Avatar data URI is missing metadata or payload")
    }

    if (metadata.includes(";base64")) {
        return Buffer.from(payload, "base64").toString("utf8")
    }

    return decodeURIComponent(payload)
}

describe("generateAvatarUrl", () => {
    it("rejects empty names instead of inventing a fallback identity", () => {
        expect(() => generateAvatarUrl("   ")).toThrow("Avatar fallback requires a non-empty name")
    })

    it("uses only the first name initial for multi-word names", () => {
        const avatarUrl = generateAvatarUrl("Jane Doe")
        const decodedSvg = decodeDataUri(avatarUrl)

        expect(decodedSvg).toContain(">J<")
        expect(decodedSvg).not.toContain(">JD<")
    })

    it("does not emit raw script or event-handler payloads for malicious names", () => {
        const maliciousName = '<script>alert("avatar")</script><svg onload="alert(1)">'

        const avatarUrl = generateAvatarUrl(maliciousName)
        const decodedSvg = decodeDataUri(avatarUrl)

        expect(avatarUrl).toStartWith("data:image/svg+xml")
        expect(decodedSvg).not.toContain("<script")
        expect(decodedSvg).not.toContain("onload=")
        expect(decodedSvg).not.toContain('alert("avatar")')
        expect(decodedSvg).not.toContain("alert(1)")
    })
})
