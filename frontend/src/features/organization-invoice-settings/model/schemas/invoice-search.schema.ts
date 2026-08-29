import * as v from "valibot"

export const stripeInvoiceIdSearchSchema = v.pipe(v.string(), v.regex(/^in_[A-Za-z0-9_]+$/))
