import * as v from "valibot"

export const requestNumberSearchSchema = v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1),
    v.maxLength(80),
    v.regex(/^[A-Za-z0-9-]+$/)
)
export const requestSheetFromTeamChatSearchSchema = v.literal("true")
export const requestSheetTeamChatOrganizationIdSearchSchema = v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1)
)
