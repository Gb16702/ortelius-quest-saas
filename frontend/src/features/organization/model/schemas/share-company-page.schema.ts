import * as v from "valibot"

export const shareCompanyPageInvitationsResponseSchema = v.object({
    success: v.boolean(),
    data: v.optional(
        v.object({
            sent: v.pipe(v.number(), v.integer(), v.minValue(0)),
            failed: v.pipe(v.number(), v.integer(), v.minValue(0)),
        })
    ),
    message: v.optional(v.string()),
})

export type ShareCompanyPageInvitationsResponse = v.InferOutput<
    typeof shareCompanyPageInvitationsResponseSchema
>
