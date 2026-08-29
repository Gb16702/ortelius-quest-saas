import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { organizationInfoSchema } from "../organization-info.schema"
import { createOrganization } from "./organization.factory"

describe("organization factory contract", () => {
    it("produces an object that parses cleanly through organizationInfoSchema", () => {
        expect(() => parseSchema(organizationInfoSchema, createOrganization())).not.toThrow()
    })
})
