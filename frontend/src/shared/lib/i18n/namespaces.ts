import type { SupportedLanguage } from "./marketing-languages"

export const appNamespaces = [
    "account",
    "chat",
    "common",
    "dashboard",
    "invitation",
    "organization-showcase",
    "requests",
    "settings",
    "team",
    "workspace",
] as const

export type AppNamespace = (typeof appNamespaces)[number]

export type AppResourceBundle = Record<AppNamespace, Record<string, unknown>>

const appResourceLoaders = {
    en: () => import("./locales/en/app").then((module) => module.enAppResources),
    fr: () => import("./locales/fr/app").then((module) => module.frAppResources),
    es: () => import("./locales/es/app").then((module) => module.esAppResources),
    nl: () => import("./locales/nl/app").then((module) => module.nlAppResources),
    vi: () => import("./locales/vi/app").then((module) => module.viAppResources),
} satisfies Record<SupportedLanguage, () => Promise<AppResourceBundle>>

export function loadAppResourceBundle(lang: SupportedLanguage): Promise<AppResourceBundle> {
    return appResourceLoaders[lang]()
}
