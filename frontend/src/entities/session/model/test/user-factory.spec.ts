import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { userSchema } from "../session.schema"
import { createUser } from "./user.factory"

describe("user factory contract", () => {
    it("produces an object that parses cleanly through userSchema", () => {
        expect(() => parseSchema(userSchema, createUser())).not.toThrow()
    })

    it("accepts the assignable role enum on overrides", () => {
        expect(() => parseSchema(userSchema, createUser({ role: "admin" }))).not.toThrow()
    })
})
