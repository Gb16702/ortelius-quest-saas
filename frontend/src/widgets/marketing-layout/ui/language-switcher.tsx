import type { ChangeEvent } from "react"
import {
    isValidLanguage,
    type SupportedLanguage,
    supportedLanguages,
} from "@/shared/lib/i18n/marketing-languages"
import { NativeSelect } from "@/shared/ui/native-select"

interface LanguageSwitcherProps {
    lang: SupportedLanguage
}

export function LanguageSwitcher({ lang }: LanguageSwitcherProps) {
    const currentLang = lang

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const newLang = event.target.value
        if (!isValidLanguage(newLang)) return

        const location = window.location
        const newPath = replacePathLanguage(location.pathname, currentLang, newLang)
        window.location.assign(`${newPath}${location.search}${location.hash}`)
    }

    return (
        <NativeSelect value={currentLang} onChange={handleChange} className="w-auto">
            {Object.entries(supportedLanguages).map(([code, { name }]) => (
                <option key={code} value={code}>
                    {name}
                </option>
            ))}
        </NativeSelect>
    )
}

function replacePathLanguage(
    pathname: string,
    currentLang: SupportedLanguage,
    newLang: SupportedLanguage
): string {
    const segments = pathname.split("/").filter(Boolean)

    if (segments.length === 0) return `/${newLang}/home`

    if (segments[0] === currentLang || isValidLanguage(segments[0])) {
        return `/${[newLang, ...segments.slice(1)].join("/")}`
    }

    return `/${[newLang, ...segments].join("/")}`
}
