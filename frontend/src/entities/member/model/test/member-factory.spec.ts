import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { organizationMemberSchema } from "../member.schema"
import { createMember } from "./member.factory"

describe("member factory contract", () => {
    it("produces an object that parses cleanly through organizationMemberSchema", () => {
        expect(() => parseSchema(organizationMemberSchema, createMember())).not.toThrow()
    })
})
