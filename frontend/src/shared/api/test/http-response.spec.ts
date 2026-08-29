import { describe, expect, it } from "bun:test"
import { parseEmptySuccessResponse } from "../http.response"

describe("parseEmptySuccessResponse", () => {
    it("rejects logical failure envelopes even when the backend omits an error code", async () => {
        const response = Response.json(
            {
                success: false,
                message: "Pin failed",
            },
            { status: 200 }
        )

        await expect(parseEmptySuccessResponse(response, "Failed")).rejects.toThrow("Pin failed")
    })
})
