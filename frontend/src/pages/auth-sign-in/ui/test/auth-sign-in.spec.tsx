import { describe, expect, it } from "bun:test"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { AuthSignInPage } from "../auth-sign-in.page"

describe("AuthSignInPage", () => {
    it("uses the explicit form action when the route delegates to a server form action", () => {
        renderWithProviders(
            <AuthSignInPage
                actionData={null}
                email="admin@example.test"
                formAction="/sign-in?redirect=%2Fme%2Frequests"
                isLoading={false}
            />
        )

        const form = document.querySelector("form")

        expect(form).toBeInstanceOf(HTMLFormElement)
        expect(form?.getAttribute("action")).toBe("/sign-in?redirect=%2Fme%2Frequests")
        expect(form?.getAttribute("method")).toBe("post")
    })
})
