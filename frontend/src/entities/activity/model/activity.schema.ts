import * as v from "valibot"

export const datePresetSchema = v.picklist(["7d", "14d", "30d", "3m", "12m", "all"])

export const eventTypesSearchSchema = v.pipe(
    v.string(),
    v.transform((value) => {
        if (value === "") return null
        if (value === "none") return []
        return value.split(",")
    }),
    v.nullable(v.array(v.pipe(v.string(), v.regex(/^[A-Za-z0-9:_-]+$/))))
)

export const activityActorSchema = v.object({
    id: v.string(),
    name: v.string(),
    image: v.nullable(v.string()),
})

export const activityEventSchema = v.object({
    id: v.string(),
    organizationId: v.string(),
    actorId: v.nullable(v.string()),
    eventType: v.string(),
    description: v.string(),
    metadata: v.nullable(v.record(v.string(), v.unknown())),
    createdAt: v.string(),
    actor: v.nullable(activityActorSchema),
    mentionedUserIsFormerMember: v.optional(v.boolean()),
})

export const activityPageSchema = v.object({
    events: v.array(activityEventSchema),
    nextCursor: v.nullable(v.string()),
})

export const eventTypeInfoSchema = v.object({
    type: v.string(),
    label: v.string(),
    description: v.string(),
})

export const activityErrorResponseSchema = v.looseObject({
    success: v.optional(v.boolean()),
    message: v.optional(v.string()),
})

export const activityEventsResponseSchema = v.looseObject({
    success: v.literal(true),
    data: activityPageSchema,
})

export const activityEventTypesResponseSchema = v.looseObject({
    success: v.literal(true),
    data: v.array(eventTypeInfoSchema),
})

export const activityScoreBreakdownItemSchema = v.object({
    eventType: v.string(),
    count: v.number(),
    points: v.number(),
})

export const activityScoreSchema = v.object({
    score: v.number(),
    previousScore: v.number(),
    totalPoints: v.number(),
    previousTotalPoints: v.number(),
    targetPoints: v.number(),
    periodDays: v.number(),
    breakdown: v.array(activityScoreBreakdownItemSchema),
})

export const activityScoreResponseSchema = v.looseObject({
    success: v.literal(true),
    data: activityScoreSchema,
})

export type ActivityEvent = v.InferOutput<typeof activityEventSchema>
export type ActivityPage = v.InferOutput<typeof activityPageSchema>
export type DatePreset = v.InferOutput<typeof datePresetSchema>
export type EventTypesSearch = v.InferOutput<typeof eventTypesSearchSchema>
export type EventTypeInfo = v.InferOutput<typeof eventTypeInfoSchema>
export type ActivityScoreBreakdownItem = v.InferOutput<typeof activityScoreBreakdownItemSchema>
export type ActivityScore = v.InferOutput<typeof activityScoreSchema>
