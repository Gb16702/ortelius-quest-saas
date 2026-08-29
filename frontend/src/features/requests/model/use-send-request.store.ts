import * as v from "valibot"
import { create } from "zustand"
import { persist } from "zustand/middleware"

const MAX_PERSISTED_COMPLETED_STEP = 4
const SEND_REQUEST_DRAFT_STORAGE_KEY = "send-request-data"
const SEND_REQUEST_DRAFT_SCHEMA_VERSION = 1
const SEND_REQUEST_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 14

const dateStringSchema = v.pipe(
    v.string(),
    v.check((value) => !Number.isNaN(Date.parse(value)))
)
const timestampSchema = v.pipe(v.number(), v.integer(), v.minValue(0))

const persistedSendRequestDataSchema = v.object({
    dateRange: v.optional(
        v.object({
            from: v.optional(dateStringSchema),
            to: v.optional(dateStringSchema),
        })
    ),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    selectedCategories: v.optional(v.array(v.string())),
    selectedServices: v.optional(v.array(v.string())),
    pallets: v.optional(v.string()),
    hazardous: v.optional(v.boolean()),
    insuranceCoverage: v.optional(v.boolean()),
    perishableGoods: v.optional(v.boolean()),
    length: v.optional(v.string()),
    width: v.optional(v.string()),
    height: v.optional(v.string()),
    volume: v.optional(v.string()),
    weight: v.optional(v.string()),
    palletCount: v.optional(v.string()),
    fragility: v.optional(v.string()),
    additionalInfo: v.optional(v.string()),
})

const persistedSendRequestStateSchema = v.object({
    data: v.fallback(v.optional(persistedSendRequestDataSchema, {}), {}),
    lastCompletedStep: v.optional(
        v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(MAX_PERSISTED_COMPLETED_STEP)),
        0
    ),
    updatedAt: timestampSchema,
})

type PersistedSendRequestState = v.InferOutput<typeof persistedSendRequestStateSchema>

interface SendRequestData {
    dateRange?: { from?: string; to?: string }
    firstName?: string
    lastName?: string
    email?: string
    selectedCategories?: string[]
    selectedServices?: string[]
    pallets?: string
    hazardous?: boolean
    insuranceCoverage?: boolean
    perishableGoods?: boolean
    length?: string
    width?: string
    height?: string
    volume?: string
    weight?: string
    palletCount?: string
    fragility?: string
    additionalInfo?: string
    documents?: File[]
}

interface SendRequestStore {
    data: SendRequestData
    errors: Record<string, string>
    lastCompletedStep: number
    _hasHydrated: boolean
    _draftUpdatedAt: number

    updateData: (updates: Partial<SendRequestData>) => void
    setErrors: (errors: Record<string, string>) => void
    clearErrors: () => void
    markStepCompleted: (step: number) => void
    resetData: () => void
    setHasHydrated: (hasHydrated: boolean) => void
}

function isPersistedDraftFresh(updatedAt: number) {
    return Date.now() - updatedAt <= SEND_REQUEST_DRAFT_TTL_MS
}

function getEmptyPersistedSendRequestState(): PersistedSendRequestState {
    return {
        data: {},
        lastCompletedStep: 0,
        updatedAt: Date.now(),
    }
}

export function clearSendRequestDraft(storage?: Pick<Storage, "removeItem">) {
    const targetStorage =
        storage ?? (typeof localStorage === "undefined" ? undefined : localStorage)

    if (!targetStorage) return

    targetStorage.removeItem(SEND_REQUEST_DRAFT_STORAGE_KEY)
}

function parsePersistedSendRequestState(persistedState: unknown) {
    const result = v.safeParse(persistedSendRequestStateSchema, persistedState)
    if (!result.success) return null
    if (!isPersistedDraftFresh(result.output.updatedAt)) return null

    return result.output
}

function migratePersistedSendRequestState(
    _persistedState: unknown,
    _persistedVersion: number
): PersistedSendRequestState {
    return getEmptyPersistedSendRequestState()
}

export const useSendRequestStore = create<SendRequestStore>()(
    persist(
        (set, _get) => ({
            data: {},
            errors: {},
            lastCompletedStep: 0,
            _hasHydrated: false,
            _draftUpdatedAt: Date.now(),

            updateData: (updates) =>
                set((state) => {
                    const touchedKeys = Object.keys(updates)
                    const hasErrorToClear = touchedKeys.some((key) => key in state.errors)
                    const nextErrors = hasErrorToClear
                        ? Object.fromEntries(
                              Object.entries(state.errors).filter(
                                  ([key]) => !touchedKeys.includes(key)
                              )
                          )
                        : state.errors
                    return {
                        data: { ...state.data, ...updates },
                        errors: nextErrors,
                        _draftUpdatedAt: Date.now(),
                    }
                }),

            setErrors: (errors) => set({ errors }),
            clearErrors: () => set({ errors: {} }),

            markStepCompleted: (step) =>
                set((state) => ({
                    lastCompletedStep: Math.max(state.lastCompletedStep, step),
                    _draftUpdatedAt: Date.now(),
                })),

            resetData: () =>
                set({
                    data: {},
                    errors: {},
                    lastCompletedStep: 0,
                    _draftUpdatedAt: Date.now(),
                }),

            setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
        }),
        {
            name: SEND_REQUEST_DRAFT_STORAGE_KEY,
            version: SEND_REQUEST_DRAFT_SCHEMA_VERSION,
            migrate: migratePersistedSendRequestState,
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            },
            merge: (persistedState, currentState) => {
                const parsedState = parsePersistedSendRequestState(persistedState)
                if (!parsedState) {
                    clearSendRequestDraft()
                    return currentState
                }

                return {
                    ...currentState,
                    data: parsedState.data,
                    lastCompletedStep: parsedState.lastCompletedStep,
                    _draftUpdatedAt: parsedState.updatedAt,
                }
            },
            partialize: (state) => {
                const { documents, ...persistedData } = state.data
                return {
                    data: persistedData,
                    lastCompletedStep: state.lastCompletedStep,
                    updatedAt: state._draftUpdatedAt,
                }
            },
        }
    )
)
