import * as v from "valibot"

export const memberProfileIdSearchSchema = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/))
