import * as v from "valibot"

export const wsTicketResponseSchema = v.object({
    ticket: v.optional(v.pipe(v.string(), v.minLength(1))),
})
