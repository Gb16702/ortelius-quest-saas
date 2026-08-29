import { describe, expect, it } from "bun:test"
import { clearClientLogoutStorage } from "../auth/client-logout"

class MemoryStorage implements Pick<Storage, "getItem" | "removeItem" | "setItem"> {
    private readonly values = new Map<string, string>()

    getItem(key: string) {
        return this.values.get(key) ?? null
    }

    removeItem(key: string) {
        this.values.delete(key)
    }

    setItem(key: string, value: string) {
        this.values.set(key, value)
    }
}

describe("clearClientLogoutStorage", () => {
    it("clears feature-owned persisted state during logout", () => {
        const storage = new MemoryStorage()
        storage.setItem("send-request-data", "draft")
        storage.setItem("ortelius_checkout", "checkout")
        storage.setItem("ortelius_billing_period", "yearly")
        storage.setItem("unrelated", "keep")

        clearClientLogoutStorage(storage)

        expect(storage.getItem("send-request-data")).toBeNull()
        expect(storage.getItem("ortelius_checkout")).toBeNull()
        expect(storage.getItem("ortelius_billing_period")).toBeNull()
        expect(storage.getItem("unrelated")).toBe("keep")
    })
})
