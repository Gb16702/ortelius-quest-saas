import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import {
    categoriesResponseSchema,
    servicesResponseSchema,
} from "../../model/schemas/request.schema"
import { catalogHandlers } from "./catalog-handlers"

describe("catalog handlers contract", () => {
    setupMswServer(...catalogHandlers)

    it("returns a categories payload that parses through categoriesResponseSchema", async () => {
        const response = await fetch("http://localhost/api/categories/organizations/acme-logistics")
        const payload = await response.json()
        expect(() => parseSchema(categoriesResponseSchema, payload)).not.toThrow()
    })

    it("returns a services payload that parses through servicesResponseSchema", async () => {
        const response = await fetch("http://localhost/api/services/organizations/acme-logistics")
        const payload = await response.json()
        expect(() => parseSchema(servicesResponseSchema, payload)).not.toThrow()
    })
})
