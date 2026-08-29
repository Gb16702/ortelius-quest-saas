import * as v from "valibot"

const selectedServicePayloadSchema = v.object({
    serviceId: v.pipe(v.string(), v.minLength(1)),
    included: v.boolean(),
    price: v.pipe(v.number(), v.minValue(0)),
})

const cargoDetailsPayloadSchema = v.object({
    weight: v.nullable(v.number()),
    volume: v.nullable(v.number()),
    palletCount: v.nullable(v.number()),
    fragility: v.nullable(v.picklist(["fragile", "robust"])),
    dimensions: v.object({
        length: v.nullable(v.number()),
        width: v.nullable(v.number()),
        height: v.nullable(v.number()),
    }),
    options: v.object({
        hazardous: v.boolean(),
        insuranceCoverage: v.boolean(),
        perishableGoods: v.boolean(),
    }),
})

export const createQuotePayloadSchema = v.object({
    requestId: v.pipe(v.string(), v.minLength(1)),
    selectedCategories: v.pipe(v.array(v.string()), v.minLength(1)),
    selectedServices: v.pipe(v.array(selectedServicePayloadSchema), v.minLength(1)),
    cargoDetails: cargoDetailsPayloadSchema,
    vatRate: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
    totalHT: v.pipe(v.number(), v.minValue(0)),
    totalTTC: v.pipe(v.number(), v.minValue(0)),
    vatAmount: v.pipe(v.number(), v.minValue(0)),
    description: v.optional(v.string()),
    legalDocumentIds: v.pipe(v.array(v.pipe(v.string(), v.uuid())), v.minLength(1)),
})

export type CreateQuotePayload = v.InferOutput<typeof createQuotePayloadSchema>
