import { describe, expect, it } from "bun:test"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    legalDocumentMutationResponseSchema,
    unwrapLegalDocumentsApiData,
} from "../legal-document.schema"

const legalDocument = {
    id: "00000000-0000-4000-8000-000000000001",
    organizationId: "org-1",
    label: "Terms",
    sizeBytes: 1024,
    mimeType: "application/pdf",
    originalFilename: "terms.pdf",
    uploadedById: "user-1",
    uploadedByName: "Ada",
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
}

describe("legal document response helpers", () => {
    it("keeps list response envelopes available for list parsing", () => {
        const data = {
            documents: [legalDocument],
            totalSizeBytes: 1024,
            quotaBytes: 10_000,
        }

        expect(unwrapLegalDocumentsApiData({ success: true, data }, "Failed")).toEqual(data)
    })

    it("keeps download URL envelopes available for download parsing", () => {
        const data = {
            url: "https://files.example.test/document.pdf",
            expiresAt: "2026-05-11T01:00:00.000Z",
        }

        expect(unwrapLegalDocumentsApiData({ success: true, data }, "Failed")).toEqual(data)
    })

    it("still rejects logical error envelopes", () => {
        expect(() =>
            unwrapLegalDocumentsApiData({ success: false, message: "Not allowed" }, "Failed")
        ).toThrow("Not allowed")
    })

    it("keeps mutation responses scoped to one document", () => {
        expect(
            safeParseSchema(legalDocumentMutationResponseSchema, {
                success: true,
                data: legalDocument,
            }).success
        ).toBe(true)
        expect(
            safeParseSchema(legalDocumentMutationResponseSchema, {
                success: true,
                data: { documents: [legalDocument] },
            }).success
        ).toBe(false)
    })
})
