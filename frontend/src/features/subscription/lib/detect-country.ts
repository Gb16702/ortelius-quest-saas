const TZ_TO_COUNTRY: Record<string, string> = {
    "Europe/Vienna": "AT",
    "Australia/Sydney": "AU",
    "Australia/Melbourne": "AU",
    "Australia/Brisbane": "AU",
    "Australia/Perth": "AU",
    "Australia/Adelaide": "AU",
    "Europe/Brussels": "BE",
    "Europe/Sofia": "BG",
    "America/Sao_Paulo": "BR",
    "America/Toronto": "CA",
    "America/Vancouver": "CA",
    "America/Montreal": "CA",
    "Europe/Zurich": "CH",
    "Asia/Shanghai": "CN",
    "Asia/Nicosia": "CY",
    "Europe/Prague": "CZ",
    "Europe/Berlin": "DE",
    "Europe/Copenhagen": "DK",
    "Europe/Tallinn": "EE",
    "Europe/Madrid": "ES",
    "Europe/Helsinki": "FI",
    "Europe/Paris": "FR",
    "Europe/London": "GB",
    "Europe/Athens": "GR",
    "Europe/Zagreb": "HR",
    "Europe/Budapest": "HU",
    "Europe/Dublin": "IE",
    "Asia/Kolkata": "IN",
    "Atlantic/Reykjavik": "IS",
    "Europe/Rome": "IT",
    "Asia/Tokyo": "JP",
    "Asia/Seoul": "KR",
    "Europe/Vaduz": "LI",
    "Europe/Vilnius": "LT",
    "Europe/Luxembourg": "LU",
    "Europe/Riga": "LV",
    "Europe/Malta": "MT",
    "America/Mexico_City": "MX",
    "Europe/Amsterdam": "NL",
    "Europe/Oslo": "NO",
    "Pacific/Auckland": "NZ",
    "Europe/Warsaw": "PL",
    "Europe/Lisbon": "PT",
    "Europe/Bucharest": "RO",
    "Europe/Stockholm": "SE",
    "Asia/Singapore": "SG",
    "Europe/Ljubljana": "SI",
    "Europe/Bratislava": "SK",
    "America/New_York": "US",
    "America/Chicago": "US",
    "America/Denver": "US",
    "America/Los_Angeles": "US",
    "America/Anchorage": "US",
    "America/Phoenix": "US",
    "Africa/Johannesburg": "ZA",
    "Asia/Dubai": "AE",
}

export function detectCountryCode(): string | null {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (tz && TZ_TO_COUNTRY[tz]) return TZ_TO_COUNTRY[tz]
    } catch {
        // ignore
    }

    try {
        for (const lang of navigator.languages ?? [navigator.language]) {
            const region = new Intl.Locale(lang).region
            if (region) return region
        }
    } catch {
        // ignore
    }

    return null
}
