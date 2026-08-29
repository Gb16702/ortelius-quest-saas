import type * as v from "valibot"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

export function parseOptionalSearchParam<T>(
    value: string | null,
    schema: v.GenericSchema<unknown, T>
): T | null {
    if (!value) return null
    const result = safeParseSchema(schema, value)
    return result.success ? result.data : null
}
