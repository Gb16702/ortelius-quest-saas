import { isValidLanguage, type SupportedLanguage } from "@/shared/lib/i18n/marketing-languages"

type MatchLike = { id: string; data: unknown } | undefined

function hasUrl(data: unknown): data is { url: string } {
    return (
        typeof data === "object" &&
        data !== null &&
        "url" in data &&
        typeof (data as { url: unknown }).url === "string"
    )
}

function hasLang(data: unknown): data is { lang: SupportedLanguage } {
    return (
        typeof data === "object" &&
        data !== null &&
        "lang" in data &&
        isValidLanguage((data as { lang: unknown }).lang as string)
    )
}

export function getLangFromMatches(
    matches: readonly MatchLike[],
    fallback: SupportedLanguage = "en"
): SupportedLanguage {
    for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        if (match && hasLang(match.data)) {
            return match.data.lang
        }
    }
    return fallback
}

export function getRequestUrl(request: Request): string {
    const url = new URL(request.url)
    const forwardedProto = request.headers.get("x-forwarded-proto")
    if (forwardedProto) url.protocol = `${forwardedProto.split(",")[0].trim()}:`
    return url.toString()
}

export function getOriginFromMatches(matches: readonly MatchLike[]): string {
    for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        if (match && hasUrl(match.data)) {
            return new URL(match.data.url).origin
        }
    }
    throw new Error("seo: no parent loader returned `url` — add it to a layout loader")
}

export function getRequestUrlFromMatches(matches: readonly MatchLike[]): string {
    for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i]
        if (match && hasUrl(match.data)) {
            return match.data.url
        }
    }
    throw new Error("seo: no parent loader returned `url` — add it to a layout loader")
}
