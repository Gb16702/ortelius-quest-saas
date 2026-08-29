import { describe, expect, it } from "bun:test"
import { readSidebarPreference, writeSidebarPreference } from "../sidebar-preference"

const SIDEBAR_PREFERENCE_STORAGE_KEY = "ortelius_sidebar_open"

function createStorage(value: string | null) {
    const items = new Map<string, string>()
    if (value !== null) {
        items.set(SIDEBAR_PREFERENCE_STORAGE_KEY, value)
    }

    return {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, nextValue: string) => {
            items.set(key, nextValue)
        },
        read: (key: string) => items.get(key) ?? null,
    }
}

describe("readSidebarPreference", () => {
    it("defaults to open when the preference is missing", () => {
        expect(readSidebarPreference({ storage: createStorage(null) })).toBe(true)
    })

    it("defaults to open when the preference is malformed", () => {
        expect(readSidebarPreference({ storage: createStorage("yes") })).toBe(true)
    })

    it("defaults to open when storage throws while reading", () => {
        const storage = {
            getItem: () => {
                throw new Error("storage unavailable")
            },
        }

        expect(readSidebarPreference({ storage })).toBe(true)
    })

    it("reads an expanded preference", () => {
        expect(readSidebarPreference({ storage: createStorage("true") })).toBe(true)
    })

    it("reads a collapsed preference", () => {
        expect(readSidebarPreference({ storage: createStorage("false") })).toBe(false)
    })
})

describe("writeSidebarPreference", () => {
    it("stores the boolean preference as a validated string value", () => {
        const storage = createStorage(null)

        writeSidebarPreference(false, { storage })

        expect(storage.read(SIDEBAR_PREFERENCE_STORAGE_KEY)).toBe("false")
    })

    it("ignores storage write failures", () => {
        const storage = {
            setItem: () => {
                throw new Error("storage unavailable")
            },
        }

        expect(() => writeSidebarPreference(true, { storage })).not.toThrow()
    })
})
