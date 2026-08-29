export function isInternalRouteHref(href: string): boolean {
    return href.startsWith("/") && !href.startsWith("//")
}
