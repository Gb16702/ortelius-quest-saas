import type { Locale } from "date-fns"
import { enUS, es, fr, nl, vi } from "date-fns/locale"

const DATE_FNS_LOCALES: Record<string, Locale> = {
    en: enUS,
    fr,
    es,
    nl,
    vi,
}

export function getDateFnsLocale(lang: string | undefined): Locale {
    if (!lang) return enUS
    const normalized = lang.toLowerCase().split("-")[0]
    return DATE_FNS_LOCALES[normalized] ?? enUS
}
