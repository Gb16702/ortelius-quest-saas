import type * as v from "valibot"
import type { authMeResponseSchema } from "@/entities/session"
import { TEST_USER_EMAIL, TEST_USER_ID, TEST_USER_NAME } from "@/shared/test/fixtures/identity"

type AuthMeResponse = v.InferInput<typeof authMeResponseSchema>

export function createAuthMeResponse(overrides: Partial<AuthMeResponse> = {}): AuthMeResponse {
    return {
        sub: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        name: TEST_USER_NAME,
        accessToken: "eyJhbGciOiJSUzI1NiJ9.payload.sig",
        ...overrides,
    }
}
