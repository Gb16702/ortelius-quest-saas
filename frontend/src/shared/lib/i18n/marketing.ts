import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { defaultLanguage, type SupportedLanguage, supportedLngs } from "./marketing-languages"
import { marketingResources } from "./marketing-resources"
import { appNamespaces, loadAppResourceBundle } from "./namespaces"

export {
    defaultLanguage,
    getLanguageFromPath,
    getPreferredLanguage,
    isValidLanguage,
    type SupportedLanguage,
    supportedLanguages,
    supportedLngs,
} from "./marketing-languages"
export { type AppNamespace, appNamespaces } from "./namespaces"

const loadedAppLanguages = new Set<SupportedLanguage>()
const pendingAppLanguages = new Map<SupportedLanguage, Promise<void>>()

i18n.use(initReactI18next).init({
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    supportedLngs,
    ns: ["translation", ...appNamespaces],
    defaultNS: "translation",
    debug: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    resources: marketingResources,
})

export function syncMarketingLanguage(lang: string): void {
    if (i18n.language === lang) return
    void i18n.changeLanguage(lang)
}

export async function ensureAppLanguageResources(lang: SupportedLanguage): Promise<void> {
    if (loadedAppLanguages.has(lang)) return

    const pending = pendingAppLanguages.get(lang)
    if (pending) return pending

    const promise = loadAppResourceBundle(lang)
        .then((resources) => {
            for (const namespace of appNamespaces) {
                i18n.addResourceBundle(lang, namespace, resources[namespace], true, true)
            }
            loadedAppLanguages.add(lang)
        })
        .finally(() => {
            pendingAppLanguages.delete(lang)
        })

    pendingAppLanguages.set(lang, promise)
    return promise
}

export function preloadAppLanguageResources(lang: SupportedLanguage): void {
    void ensureAppLanguageResources(lang)
}

export async function changeAppLanguage(lang: SupportedLanguage): Promise<void> {
    await ensureAppLanguageResources(lang)
    await i18n.changeLanguage(lang)
}
