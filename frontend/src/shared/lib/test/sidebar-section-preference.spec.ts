import { describe, expect, it } from "bun:test"
import {
    readSidebarSectionPreference,
    writeSidebarSectionPreference,
} from "../sidebar-section-preference"

const SIDEBAR_SECTION_PREFERENCES_STORAGE_KEY = "ortelius_sidebar_sections"

function createStorage(value: string | null) {
    const items = new Map<string, string>()
    if (value !== null) {
        items.set(SIDEBAR_SECTION_PREFERENCES_STORAGE_KEY, value)
    }

    return {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, nextValue: string) => {
            items.set(key, nextValue)
        },
        read: (key: string) => items.get(key) ?? null,
    }
}

describe("readSidebarSectionPreference", () => {
    it("defaults to open when section preferences are missing", () => {
        expect(readSidebarSectionPreference("org:one:try", { storage: createStorage(null) })).toBe(
            true
        )
    })

    it("defaults to open when section preferences are malformed", () => {
        expect(readSidebarSectionPreference("org:one:try", { storage: createStorage("[]") })).toBe(
            true
        )
    })

    it("reads an expanded section preference", () => {
        expect(
            readSidebarSectionPreference("org:one:try", {
                storage: createStorage(JSON.stringify({ "org:one:try": true })),
            })
        ).toBe(true)
    })

    it("reads a collapsed section preference", () => {
        expect(
            readSidebarSectionPreference("org:one:try", {
                storage: createStorage(JSON.stringify({ "org:one:try": false })),
            })
        ).toBe(false)
    })
})

describe("writeSidebarSectionPreference", () => {
    it("stores section preferences in one light local storage entry", () => {
        const storage = createStorage(null)

        writeSidebarSectionPreference("org:one:try", false, { storage })

        expect(storage.read(SIDEBAR_SECTION_PREFERENCES_STORAGE_KEY)).toBe(
            JSON.stringify({ "org:one:try": false })
        )
    })

    it("preserves other section preferences", () => {
        const storage = createStorage(JSON.stringify({ "org:one:pages": false }))

        writeSidebarSectionPreference("org:one:try", false, { storage })

        expect(storage.read(SIDEBAR_SECTION_PREFERENCES_STORAGE_KEY)).toBe(
            JSON.stringify({ "org:one:pages": false, "org:one:try": false })
        )
    })

    it("ignores storage write failures", () => {
        const storage = {
            getItem: () => null,
            setItem: () => {
                throw new Error("storage unavailable")
            },
        }

        expect(() => writeSidebarSectionPreference("org:one:try", true, { storage })).not.toThrow()
    })
})
