import * as v from "valibot"

const SIDEBAR_PREFERENCE_STORAGE_KEY = "ortelius_sidebar_open"
const DEFAULT_SIDEBAR_OPEN = true

const sidebarPreferenceSchema = v.picklist(["true", "false"])

interface SidebarPreferenceStorage {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
}

interface ReadSidebarPreferenceOptions {
    storage?: Pick<SidebarPreferenceStorage, "getItem">
    fallback?: boolean
}

interface WriteSidebarPreferenceOptions {
    storage?: Pick<SidebarPreferenceStorage, "setItem">
}

function getLocalStorage(): Storage | undefined {
    return typeof localStorage === "undefined" ? undefined : localStorage
}

export function readSidebarPreference({
    storage,
    fallback = DEFAULT_SIDEBAR_OPEN,
}: ReadSidebarPreferenceOptions = {}): boolean {
    const targetStorage = storage ?? getLocalStorage()

    if (!targetStorage) return fallback

    try {
        const result = v.safeParse(
            sidebarPreferenceSchema,
            targetStorage.getItem(SIDEBAR_PREFERENCE_STORAGE_KEY)
        )

        if (!result.success) return fallback

        return result.output === "true"
    } catch {
        return fallback
    }
}

export function writeSidebarPreference(
    open: boolean,
    { storage }: WriteSidebarPreferenceOptions = {}
): void {
    const targetStorage = storage ?? getLocalStorage()

    if (!targetStorage) return

    try {
        targetStorage.setItem(SIDEBAR_PREFERENCE_STORAGE_KEY, String(open))
    } catch {
        // Storage may be unavailable in private browsing or constrained embeds.
    }
}
