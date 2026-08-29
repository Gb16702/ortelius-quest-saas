const COUNTRY_CODES = [
    "AT",
    "AU",
    "BE",
    "BG",
    "BR",
    "CA",
    "CH",
    "CN",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GR",
    "HR",
    "HU",
    "IE",
    "IN",
    "IS",
    "IT",
    "JP",
    "KR",
    "LI",
    "LT",
    "LU",
    "LV",
    "MT",
    "MX",
    "NL",
    "NO",
    "NZ",
    "PL",
    "PT",
    "RO",
    "SE",
    "SG",
    "SI",
    "SK",
    "US",
    "ZA",
    "AE",
] as const

export interface CountryOption {
    code: string
    name: string
}

function getCountryName(code: string, locale: string): string {
    try {
        return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code
    } catch {
        return code
    }
}

export function getCountries(locale: string = "en"): CountryOption[] {
    return COUNTRY_CODES.map((code) => ({
        code,
        name: getCountryName(code, locale),
    })).sort((a, b) => a.name.localeCompare(b.name, locale))
}
