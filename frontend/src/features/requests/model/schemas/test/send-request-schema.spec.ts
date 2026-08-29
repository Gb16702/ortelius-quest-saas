import { describe, expect, it } from "bun:test"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    cargoTypeSchema,
    contactInfoSchema,
    requestDocumentsUploadResponseSchema,
    sendRequestPayloadSchema,
    sendRequestResponseSchema,
    servicesSchema,
} from "../send-request.schema"

// --- contactInfoSchema ---

describe("contactInfoSchema valid inputs", () => {
    it("accepts a complete contact info object", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "Alice",
            lastName: "Martin",
            email: "alice@example.com",
            dateRange: {
                from: "2026-06-01",
                to: "2026-06-15",
            },
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.email).toBe("alice@example.com")
        }
    })

    it("accepts a name that is exactly 50 characters", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "A".repeat(50),
            lastName: "B".repeat(50),
            email: "user@example.com",
            dateRange: { from: "2026-06-01", to: "2026-06-30" },
        })
        expect(result.success).toBe(true)
    })

    it("accepts a minimal single-character first name", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "A",
            lastName: "Z",
            email: "az@example.com",
            dateRange: { from: "2026-01-01", to: "2026-02-01" },
        })
        expect(result.success).toBe(true)
    })

    it("accepts a valid international email address", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "Jean",
            lastName: "Dupont",
            email: "jean.dupont+tag@enterprise.co.fr",
            dateRange: { from: "2026-07-01", to: "2026-07-14" },
        })
        expect(result.success).toBe(true)
    })

    it("accepts non-overlapping date range (same from/to)", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "Sam",
            lastName: "Lee",
            email: "sam@example.com",
            dateRange: { from: "2026-05-20", to: "2026-05-20" },
        })
        expect(result.success).toBe(true)
    })
})

describe("contactInfoSchema invalid inputs", () => {
    it("rejects malformed email (no @)", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "Bob",
            lastName: "Smith",
            email: "not-an-email",
            dateRange: { from: "2026-06-01", to: "2026-06-15" },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true)
            expect(result.error.issues[0]?.code).toBe("invalid_format")
        }
    })

    it("rejects empty firstName", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "",
            lastName: "Smith",
            email: "bob@example.com",
            dateRange: { from: "2026-06-01", to: "2026-06-15" },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("firstName"))).toBe(true)
        }
    })

    it("rejects firstName exceeding 50 characters", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "A".repeat(51),
            lastName: "Smith",
            email: "bob@example.com",
            dateRange: { from: "2026-06-01", to: "2026-06-15" },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("firstName"))).toBe(true)
        }
    })

    it("rejects empty from date", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "Alice",
            lastName: "Martin",
            email: "alice@example.com",
            dateRange: { from: "", to: "2026-06-15" },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("from"))).toBe(true)
        }
    })

    it("rejects empty to date", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "Alice",
            lastName: "Martin",
            email: "alice@example.com",
            dateRange: { from: "2026-06-01", to: "" },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("to"))).toBe(true)
        }
    })

    it("rejects missing dateRange entirely", () => {
        const result = safeParseSchema(contactInfoSchema, {
            firstName: "Alice",
            lastName: "Martin",
            email: "alice@example.com",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("dateRange"))).toBe(true)
        }
    })
})

// --- cargoTypeSchema ---

describe("cargoTypeSchema valid inputs", () => {
    it("accepts one cargo category", () => {
        const result = safeParseSchema(cargoTypeSchema, { selectedCategories: ["electronics"] })
        expect(result.success).toBe(true)
    })

    it("accepts multiple cargo categories", () => {
        const result = safeParseSchema(cargoTypeSchema, {
            selectedCategories: ["electronics", "furniture", "hazmat"],
        })
        expect(result.success).toBe(true)
    })
})

describe("cargoTypeSchema invalid inputs", () => {
    it("rejects empty selectedCategories array", () => {
        const result = safeParseSchema(cargoTypeSchema, { selectedCategories: [] })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("selectedCategories"))).toBe(
                true
            )
        }
    })

    it("rejects missing selectedCategories", () => {
        const result = safeParseSchema(cargoTypeSchema, {})
        expect(result.success).toBe(false)
    })
})

// --- servicesSchema ---

describe("servicesSchema valid inputs", () => {
    it("accepts at least one service", () => {
        const result = safeParseSchema(servicesSchema, { selectedServices: ["air-freight"] })
        expect(result.success).toBe(true)
    })

    it("accepts multiple services", () => {
        const result = safeParseSchema(servicesSchema, {
            selectedServices: ["air-freight", "sea-freight", "customs"],
        })
        expect(result.success).toBe(true)
    })
})

describe("servicesSchema invalid inputs", () => {
    it("rejects empty selectedServices array", () => {
        const result = safeParseSchema(servicesSchema, { selectedServices: [] })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("selectedServices"))).toBe(true)
        }
    })
})

// --- sendRequestPayloadSchema ---

const validPayload = {
    requesterEmail: "requester@example.com",
    requesterName: "Alice Martin",
    categories: ["electronics"],
    services: ["air-freight"],
    cargoDetails: {
        weight: 200,
        volume: 10,
        dimensions: {
            length: 120,
            width: 80,
            height: 60,
        },
        palletCount: 2,
        fragility: "fragile",
        options: {
            hazardous: false,
            insuranceCoverage: true,
            perishableGoods: false,
        },
    },
    comments: "Please handle with care.",
    documents: ["https://example.com/doc.pdf"],
    fromDate: "2026-06-01",
    toDate: "2026-06-15",
    receiverOrganizationId: "org-123",
}

describe("sendRequestPayloadSchema valid inputs", () => {
    it("accepts a complete valid payload", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, validPayload)
        expect(result.success).toBe(true)
    })

    it("accepts payload with null receiverOrganizationId", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            receiverOrganizationId: null,
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.receiverOrganizationId).toBeNull()
        }
    })

    it("accepts payload with all optional cargo fields omitted", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                dimensions: {},
                options: {
                    hazardous: false,
                    insuranceCoverage: false,
                    perishableGoods: false,
                },
            },
        })
        expect(result.success).toBe(true)
    })

    it("accepts payload with empty documents array", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            documents: [],
        })
        expect(result.success).toBe(true)
    })

    it("accepts payload with trimmed whitespace-only requesterName becoming valid", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            requesterName: "  Bob  ",
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.requesterName).toBe("Bob")
        }
    })

    it("accepts multiple document URLs", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            documents: ["https://example.com/doc1.pdf", "http://files.example.org/doc2.pdf"],
        })
        expect(result.success).toBe(true)
    })
})

describe("sendRequestPayloadSchema invalid inputs", () => {
    it("rejects malformed requesterEmail", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            requesterEmail: "not-an-email",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("requesterEmail"))).toBe(true)
            expect(result.error.issues[0]?.code).toBe("invalid_format")
        }
    })

    it("rejects whitespace-only requesterName (after trim)", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            requesterName: "   ",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("requesterName"))).toBe(true)
        }
    })

    it("rejects empty categories array", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            categories: [],
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("categories"))).toBe(true)
        }
    })

    it("rejects empty services array", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            services: [],
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("services"))).toBe(true)
        }
    })

    it("rejects non-finite cargo weight (Infinity)", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                ...validPayload.cargoDetails,
                weight: Infinity,
            },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("weight"))).toBe(true)
        }
    })

    it("rejects non-finite volume (NaN)", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                ...validPayload.cargoDetails,
                volume: Number.NaN,
            },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("volume"))).toBe(true)
        }
    })

    it("rejects negative cargo weight", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                ...validPayload.cargoDetails,
                weight: -100,
            },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("weight"))).toBe(true)
        }
    })

    it("rejects negative cargo volume", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                ...validPayload.cargoDetails,
                volume: -5,
            },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("volume"))).toBe(true)
        }
    })

    it("rejects negative cargo dimension (length)", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                ...validPayload.cargoDetails,
                dimensions: {
                    ...validPayload.cargoDetails.dimensions,
                    length: -1,
                },
            },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(
                result.error.issues.some(
                    (i) => i.path.includes("dimensions") && i.path.includes("length")
                )
            ).toBe(true)
        }
    })

    it("rejects negative palletCount", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                ...validPayload.cargoDetails,
                palletCount: -1,
            },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("palletCount"))).toBe(true)
        }
    })

    it("rejects non-integer palletCount", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                ...validPayload.cargoDetails,
                palletCount: 2.5,
            },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("palletCount"))).toBe(true)
        }
    })

    it("rejects a document URL using a non-HTTP/HTTPS scheme", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            documents: ["ftp://files.example.com/doc.pdf"],
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path[0] === "documents")).toBe(true)
        }
    })

    it("rejects a document that is not a URL at all", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            documents: ["not-a-url"],
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path[0] === "documents")).toBe(true)
        }
    })

    it("rejects empty fromDate", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            fromDate: "",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("fromDate"))).toBe(true)
        }
    })

    it("rejects empty toDate", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            toDate: "",
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("toDate"))).toBe(true)
        }
    })

    it("rejects missing cargoDetails.options.hazardous", () => {
        const result = safeParseSchema(sendRequestPayloadSchema, {
            ...validPayload,
            cargoDetails: {
                ...validPayload.cargoDetails,
                options: {
                    insuranceCoverage: true,
                    perishableGoods: false,
                },
            },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("hazardous"))).toBe(true)
        }
    })
})

// --- sendRequestResponseSchema ---

describe("sendRequestResponseSchema valid inputs", () => {
    it("accepts success:true with no message", () => {
        const result = safeParseSchema(sendRequestResponseSchema, { success: true })
        expect(result.success).toBe(true)
    })

    it("accepts success:true with an optional message", () => {
        const result = safeParseSchema(sendRequestResponseSchema, {
            success: true,
            message: "Request sent successfully.",
        })
        expect(result.success).toBe(true)
    })
})

describe("sendRequestResponseSchema invalid inputs", () => {
    it("rejects success:false", () => {
        const result = safeParseSchema(sendRequestResponseSchema, { success: false })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path.includes("success"))).toBe(true)
        }
    })

    it("rejects missing success field", () => {
        const result = safeParseSchema(sendRequestResponseSchema, { message: "ok" })
        expect(result.success).toBe(false)
    })
})

// --- requestDocumentsUploadResponseSchema ---

describe("requestDocumentsUploadResponseSchema valid inputs", () => {
    it("accepts top-level documents array", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, {
            documents: ["https://cdn.example.com/file.pdf"],
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toEqual(["https://cdn.example.com/file.pdf"])
        }
    })

    it("accepts nested data.documents array", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, {
            data: {
                documents: ["https://cdn.example.com/nested.pdf"],
            },
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toEqual(["https://cdn.example.com/nested.pdf"])
        }
    })

    it("accepts multiple document URLs in top-level array", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, {
            documents: ["https://cdn.example.com/a.pdf", "https://cdn.example.com/b.pdf"],
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toHaveLength(2)
        }
    })

    it("prefers data.documents over top-level documents when both are present", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, {
            data: { documents: ["https://example.com/inner.pdf"] },
            documents: ["https://example.com/outer.pdf"],
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toEqual(["https://example.com/inner.pdf"])
        }
    })
})

describe("requestDocumentsUploadResponseSchema invalid inputs", () => {
    it("rejects when both documents and data.documents are absent", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, {})
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.code).toBe("custom")
        }
    })

    it("rejects when top-level documents array is empty", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, { documents: [] })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.code).toBe("custom")
        }
    })

    it("rejects when a document URL uses a non-HTTP scheme (ftp)", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, {
            documents: ["ftp://files.example.com/doc.pdf"],
        })
        expect(result.success).toBe(false)
    })

    it("rejects when a document is not a valid URL", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, {
            documents: ["not-a-url"],
        })
        expect(result.success).toBe(false)
    })

    it("rejects when data.documents is an empty array", () => {
        const result = safeParseSchema(requestDocumentsUploadResponseSchema, {
            data: { documents: [] },
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0]?.code).toBe("custom")
        }
    })
})
