import { describe, expect, it } from "bun:test"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { parseOrganizationInfoResponse } from "../../model/organization-info.schema"
import { organizationHandlers } from "./organization-handlers"

describe("organization handlers contract", () => {
    setupMswServer(...organizationHandlers)

    it("returns an organization payload that parses through parseOrganizationInfoResponse", async () => {
        const response = await fetch("http://localhost/api/organizations/organization-1/info")
        const payload = await response.json()
        expect(() => parseOrganizationInfoResponse("organization-1", payload)).not.toThrow()
    })
})
