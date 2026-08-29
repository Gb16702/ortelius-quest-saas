import * as v from "valibot"
import { assertSuccessfulResponse, readJsonResponse } from "@/shared/api/http.response"

const memberMutationResponseSchema = v.pipe(
    v.looseObject({
        success: v.optional(v.literal(true)),
        message: v.optional(v.string()),
        data: v.optional(
            v.looseObject({
                message: v.optional(v.string()),
            })
        ),
    }),
    v.check(
        (payload) =>
            payload.success === true || payload.message !== undefined || payload.data !== undefined,
        "Mutation response must include a success signal or message payload"
    )
)

const membersErrorResponseSchema = v.looseObject({
    message: v.optional(v.string()),
})

export type MemberMutationResponse = v.InferOutput<typeof memberMutationResponseSchema>

function getMembersApiErrorMessage(payload: unknown, fallback: string): string {
    const result = v.safeParse(membersErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.output.message || fallback
}

export async function parseMemberMutationResponse(res: Response, fallback: string) {
    const json = await readJsonResponse(res)
    if (!res.ok) throw new Error(getMembersApiErrorMessage(json, fallback))
    assertSuccessfulResponse(json, fallback, res.status)
    if (json === null) return { success: true } satisfies MemberMutationResponse
    return v.parse(memberMutationResponseSchema, json)
}
