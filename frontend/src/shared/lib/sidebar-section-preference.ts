import * as v from "valibot"

const SIDEBAR_SECTION_PREFERENCES_STORAGE_KEY = "ortelius_sidebar_sections"
const DEFAULT_SIDEBAR_SECTION_OPEN = true

const sidebarSectionPreferencesSchema = v.record(v.string(), v.boolean())

interface SidebarSectionPreferenceStorage {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
}

interface ReadSidebarSectionPreferenceOptions {
    storage?: Pick<SidebarSectionPreferenceStorage, "getItem">
    fallback?: boolean
}

interface WriteSidebarSectionPreferenceOptions {
    storage?: Pick<SidebarSectionPreferenceStorage, "getItem" | "setItem">
}

function getLocalStorage(): Storage | undefined {
    return typeof localStorage === "undefined" ? undefined : localStorage
}

function readSidebarSectionPreferences(
    storage: Pick<SidebarSectionPreferenceStorage, "getItem"> | undefined
): Record<string, boolean> | null {
    if (!storage) return null

    try {
        const rawValue = storage.getItem(SIDEBAR_SECTION_PREFERENCES_STORAGE_KEY)
        if (!rawValue) return null

        const parsedValue: unknown = JSON.parse(rawValue)
        const result = v.safeParse(sidebarSectionPreferencesSchema, parsedValue)

        if (!result.success) return null

        return result.output
    } catch {
        return null
    }
}

export function readSidebarSectionPreference(
    sectionId: string,
    { storage, fallback = DEFAULT_SIDEBAR_SECTION_OPEN }: ReadSidebarSectionPreferenceOptions = {}
): boolean {
    const preferences = readSidebarSectionPreferences(storage ?? getLocalStorage())

    if (!preferences || !(sectionId in preferences)) return fallback

    return preferences[sectionId]
}

export function writeSidebarSectionPreference(
    sectionId: string,
    open: boolean,
    { storage }: WriteSidebarSectionPreferenceOptions = {}
): void {
    const targetStorage = storage ?? getLocalStorage()

    if (!targetStorage) return

    try {
        const preferences = readSidebarSectionPreferences(targetStorage) ?? {}
        targetStorage.setItem(
            SIDEBAR_SECTION_PREFERENCES_STORAGE_KEY,
            JSON.stringify({ ...preferences, [sectionId]: open })
        )
    } catch {
        // Storage may be unavailable in private browsing or constrained embeds.
    }
}
