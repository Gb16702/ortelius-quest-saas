import { afterAll, afterEach, describe, expect, it } from "bun:test"
import { getSignInPageProps, handleSignInRequest } from "../sign-in.server"

const originalFetch = globalThis.fetch

function installSuccessfulDevLoginFetch() {
    let callCount = 0
    const mockedFetch = Object.assign(
        () => {
            callCount += 1
            if (callCount === 1) {
                return Promise.resolve(
                    Response.json({
                        accessToken: "dev-access-token",
                        refreshToken: "dev-refresh-token",
                    })
                )
            }

            return Promise.resolve(
                Response.json({
                    organization: {
                        id: "org-1",
                        name: "Acme",
                        slug: "acme",
                        logo: null,
                    },
                })
            )
        },
        { preconnect: originalFetch.preconnect }
    ) satisfies typeof fetch

    globalThis.fetch = mockedFetch
}

afterEach(() => {
    globalThis.fetch = originalFetch
})

afterAll(() => {
    globalThis.fetch = originalFetch
})

describe("sign-in server route", () => {
    it("maps failed sign-in redirects back to inline error page props", () => {
        const request = new Request(
            "http://127.0.0.1:5174/sign-in?email=admin%40example.test&error=invalid_credentials"
        )

        expect(getSignInPageProps(request)).toMatchObject({
            actionData: { error: "Invalid email or password" },
            email: "admin@example.test",
            formAction: "/sign-in?email=admin%40example.test",
        })
    })

    it("sets local dev cookies after a successful local login before redirecting", async () => {
        installSuccessfulDevLoginFetch()

        const response = await handleSignInRequest(
            new Request("http://127.0.0.1:5174/sign-in", {
                body: new URLSearchParams({
                    email: "admin@example.test",
                    password: "password",
                }),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Origin: "http://127.0.0.1:5174",
                },
                method: "POST",
            })
        )

        expect(response.status).toBe(303)
        expect(response.headers.get("Location")).toBe("/org/acme/requests")
        expect(response.headers.get("Set-Cookie")).toContain("dev_access_token=")
    })
})
