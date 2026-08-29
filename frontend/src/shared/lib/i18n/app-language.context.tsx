import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import { appNamespaces, changeAppLanguage } from "./marketing"
import type { SupportedLanguage } from "./marketing-languages"

interface AppLanguageContextValue {
    lang: SupportedLanguage
    setLanguage: (lang: SupportedLanguage) => void
}

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null)

interface AppLanguageProviderProps {
    initialLang: SupportedLanguage
    children: ReactNode
}

export function AppLanguageProvider({ initialLang, children }: AppLanguageProviderProps) {
    const { i18n } = useTranslation()
    const [lang, setLang] = useState(initialLang)
    const [hasReadyLanguage, setHasReadyLanguage] = useState(() =>
        isAppLanguageReady(i18n, initialLang)
    )
    const [, forceRender] = useReducer((count: number) => count + 1, 0)

    useEffect(() => {
        document.documentElement.lang = lang
    }, [lang])

    useEffect(() => {
        let cancelled = false

        if (isAppLanguageReady(i18n, lang)) {
            setHasReadyLanguage(true)
            return
        }

        void changeAppLanguage(lang).then(
            () => {
                if (!cancelled) {
                    setHasReadyLanguage(true)
                    forceRender()
                }
            },
            () => {
                if (!cancelled) {
                    setHasReadyLanguage(true)
                    forceRender()
                }
            }
        )

        return () => {
            cancelled = true
        }
    }, [i18n, lang])

    const setLanguage = useCallback((nextLang: SupportedLanguage) => {
        setLang((currentLang) => (currentLang === nextLang ? currentLang : nextLang))
    }, [])

    const value = useMemo(
        () => ({
            lang,
            setLanguage,
        }),
        [lang, setLanguage]
    )

    if (!hasReadyLanguage) return null

    return <AppLanguageContext value={value}>{children}</AppLanguageContext>
}

export function useAppLanguage(): AppLanguageContextValue {
    const context = use(AppLanguageContext)
    if (!context) {
        throw new Error("useAppLanguage must be used within AppLanguageProvider")
    }
    return context
}

function isAppLanguageReady(
    i18n: ReturnType<typeof useTranslation>["i18n"],
    lang: SupportedLanguage
): boolean {
    return (
        i18n.language === lang &&
        appNamespaces.every((namespace) => i18n.hasResourceBundle(lang, namespace))
    )
}
