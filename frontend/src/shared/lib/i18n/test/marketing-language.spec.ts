import { afterAll, describe, expect, it } from "bun:test"
import { getPreferredLanguage } from "../marketing-languages"

const envDefaults = {
    API_URL: "https://api.example.test",
    APP_ORIGIN: "https://app.example.test",
    AUTH_URL: "https://auth.example.test",
    LOGIN_URL: "https://login.example.test",
    NODE_ENV: "development",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(envDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(envDefaults)) {
    process.env[key] = value
}

const { getLangCookie, LANG_COOKIE_NAME, serializeLangCookie } = await import(
    "../lang-cookie.server"
)

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

describe("marketing language preferences", () => {
    it("uses the highest quality supported browser language", () => {
        expect(getPreferredLanguage("de-DE,de;q=0.9,fr-BE;q=0.8,en;q=0.7")).toBe("fr")
        expect(getPreferredLanguage("fr-BE;q=0.2,en-US;q=0.9")).toBe("en")
    })

    it("ignores unsupported or disabled browser language entries", () => {
        expect(getPreferredLanguage("fr;q=0,de;q=1,nl;q=0.7")).toBe("nl")
        expect(getPreferredLanguage("de-DE,pt-BR")).toBe("en")
    })

    it("reads and serializes the persisted language cookie", () => {
        const request = new Request("https://app.example.test/home", {
            headers: { Cookie: `${LANG_COOKIE_NAME}=fr` },
        })

        expect(getLangCookie(request)).toBe("fr")
        expect(serializeLangCookie("fr")).toContain(`${LANG_COOKIE_NAME}=fr`)
        expect(serializeLangCookie("fr")).toContain("Path=/")
        expect(serializeLangCookie("fr")).toContain("HttpOnly")
        expect(serializeLangCookie("fr")).toContain("SameSite=Lax")
    })
})
