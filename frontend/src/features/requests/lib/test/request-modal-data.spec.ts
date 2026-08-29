import { describe, expect, it } from "bun:test"
import { getActiveModalRequestData } from "../request-modal-data"

describe("getActiveModalRequestData", () => {
    it("keeps request data only when it matches the active request number", () => {
        const requestData = {
            id: "request-a",
            reqNumber: "REQ-A",
            lifecycleStatus: "open",
            closedReason: null,
        }

        expect(getActiveModalRequestData(requestData, "REQ-A")).toBe(requestData)
        expect(getActiveModalRequestData(requestData, "REQ-B")).toBeNull()
        expect(getActiveModalRequestData(requestData, null)).toBeNull()
        expect(getActiveModalRequestData(null, "REQ-A")).toBeNull()
    })
})
