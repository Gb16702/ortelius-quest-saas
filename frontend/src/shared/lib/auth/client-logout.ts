const CLIENT_LOGOUT_STORAGE_KEYS = [
    "send-request-data",
    "ortelius_checkout",
    "ortelius_billing_period",
] as const

const LOGGED_IN_COOKIE = "loggedIn"
const LOGGED_IN_CLASS = "logged-in"

export function clearClientLogoutStorage(storage?: Pick<Storage, "removeItem">) {
    const targetStorage =
        storage ?? (typeof localStorage === "undefined" ? undefined : localStorage)

    if (!targetStorage) return

    for (const key of CLIENT_LOGOUT_STORAGE_KEYS) {
        targetStorage.removeItem(key)
    }
}

export function setClientLoggedInHint() {
    if (typeof document === "undefined") return

    document.cookie = `${LOGGED_IN_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax${getSecureCookieAttribute()}`
    document.documentElement.classList.add(LOGGED_IN_CLASS)
}

export function clearClientLoggedInHint() {
    if (typeof document === "undefined") return

    document.cookie = `${LOGGED_IN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${getSecureCookieAttribute()}`
    document.documentElement.classList.remove(LOGGED_IN_CLASS)
}

function getSecureCookieAttribute(): string {
    if (typeof window === "undefined") return ""
    return window.location.protocol === "https:" ? "; Secure" : ""
}

export function redirectToAuthLogout() {
    window.location.assign("/auth/logout")
}

export function redirectToAuthLogoutWithCleanup() {
    clearClientLogoutStorage()
    clearClientLoggedInHint()
    redirectToAuthLogout()
}
