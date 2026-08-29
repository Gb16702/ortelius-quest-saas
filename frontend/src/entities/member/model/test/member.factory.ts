import type * as v from "valibot"
import { TEST_USER_EMAIL, TEST_USER_ID, TEST_USER_NAME } from "@/shared/test/fixtures/identity"
import type { organizationMemberSchema } from "../member.schema"

type MemberInput = v.InferInput<typeof organizationMemberSchema>

export function createMember(overrides: Partial<MemberInput> = {}): MemberInput {
    return {
        id: "member-1",
        role: "member",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-02T00:00:00.000Z",
        user: {
            id: TEST_USER_ID,
            name: TEST_USER_NAME,
            email: TEST_USER_EMAIL,
            image: null,
            twoFactorEnabled: false,
        },
        ...overrides,
    }
}
