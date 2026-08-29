import {
    createOrganizationFontCssVariables,
    getOrganizationFontStylesheetHref,
    ORGANIZATION_FONT_STYLESHEET_LINK_ID,
} from "./organization-font"

export function applyOrganizationFontToDocument(
    value: unknown,
    targetDocument?: Document
): () => void {
    const doc = targetDocument ?? (typeof document === "undefined" ? null : document)
    if (!doc) return () => undefined

    const variables = createOrganizationFontCssVariables(value)
    const stylesheetHref = getOrganizationFontStylesheetHref(value)
    const root = doc.documentElement

    for (const [key, variableValue] of Object.entries(variables)) {
        if (variableValue !== undefined) root.style.setProperty(key, String(variableValue))
    }

    const link = ensureOrganizationFontStylesheetLink(doc)
    const createdLink = link.created
    const stylesheetLink = link.element
    stylesheetLink.rel = "stylesheet"
    stylesheetLink.href = stylesheetHref
    stylesheetLink.dataset.organizationFontHref = stylesheetHref

    return () => {
        for (const key of Object.keys(variables)) {
            root.style.removeProperty(key)
        }

        const currentLink = doc.getElementById(ORGANIZATION_FONT_STYLESHEET_LINK_ID)
        if (createdLink && isHtmlLinkElement(doc, currentLink)) {
            currentLink.remove()
        }
    }
}

function ensureOrganizationFontStylesheetLink(doc: Document): {
    element: HTMLLinkElement
    created: boolean
} {
    const currentLink = doc.getElementById(ORGANIZATION_FONT_STYLESHEET_LINK_ID)
    if (isHtmlLinkElement(doc, currentLink)) {
        return { element: currentLink, created: false }
    }
    currentLink?.remove()

    const link = doc.createElement("link")
    link.id = ORGANIZATION_FONT_STYLESHEET_LINK_ID
    link.dataset.organizationFontRuntime = "true"
    doc.head.appendChild(link)

    return { element: link, created: true }
}

function isHtmlLinkElement(doc: Document, element: Element | null): element is HTMLLinkElement {
    const linkConstructor = doc.defaultView?.HTMLLinkElement

    return Boolean(linkConstructor && element instanceof linkConstructor)
}
