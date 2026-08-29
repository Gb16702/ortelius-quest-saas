import type * as v from "valibot"
import { TEST_USER_EMAIL, TEST_USER_ID, TEST_USER_NAME } from "@/shared/test/fixtures/identity"
import type { userSchema } from "../session.schema"

type UserInput = v.InferInput<typeof userSchema>

export function createUser(overrides: Partial<UserInput> = {}): UserInput {
    return {
        id: TEST_USER_ID,
        name: TEST_USER_NAME,
        email: TEST_USER_EMAIL,
        emailVerified: true,
        image: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        twoFactorEnabled: false,
        stripeCustomerId: null,
        role: "member",
        dominantColor: null,
        ...overrides,
    }
}
