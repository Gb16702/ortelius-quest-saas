export const isMac = () => {
    if (typeof window === "undefined") return false
    const isMacPlatform = navigator.platform.toUpperCase().indexOf("MAC") >= 0
    return isMacPlatform || navigator.userAgent.includes("Mac")
}

export const getModifierKey = () => (isMac() ? "⌘" : "Ctrl")

export const isModifierKeyPressed = (event: KeyboardEvent) => {
    return isMac() ? event.metaKey : event.ctrlKey
}
