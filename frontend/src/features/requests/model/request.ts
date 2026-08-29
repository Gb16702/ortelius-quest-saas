import type * as v from "valibot"
import type { ServiceType } from "@/entities/service-type"
import type {
    assignedUserSchema,
    cargoDetailsDimensionsSchema,
    cargoDetailsOptionsSchema,
    cargoDetailsSchema,
    organizationRequestListItemSchema,
    organizationRequestsListDataSchema,
    personalRequestListItemSchema,
    personalRequestsListDataSchema,
    requestCategorySchema,
    requestClosedReasonSchema,
    requestDetailSchema,
    requestLifecycleStatusSchema,
    requestListItemSchema,
    requestPrioritySchema,
    requestServiceSchema,
    shareToTeamChatResponseSchema,
} from "./schemas/request.schema"

export type { ServiceType }

export interface StepRef {
    validate: () => Promise<boolean>
}

export type RequestLifecycleStatus = v.InferOutput<typeof requestLifecycleStatusSchema>
export type RequestClosedReason = v.InferOutput<typeof requestClosedReasonSchema>
export type RequestPriority = v.InferOutput<typeof requestPrioritySchema>
export type AssignedUser = v.InferOutput<typeof assignedUserSchema>
export type OrganizationUserRequest = v.InferOutput<typeof organizationRequestListItemSchema>
export type PersonalUserRequest = v.InferOutput<typeof personalRequestListItemSchema>
export type UserRequest = v.InferOutput<typeof requestListItemSchema>
export type RequestData = v.InferOutput<typeof requestDetailSchema>
export type OrganizationRequestsListData = v.InferOutput<typeof organizationRequestsListDataSchema>
export type PersonalRequestsListData = v.InferOutput<typeof personalRequestsListDataSchema>
export type RequestsListData = OrganizationRequestsListData | PersonalRequestsListData
export type ShareToTeamChatResponse = v.InferOutput<typeof shareToTeamChatResponseSchema>

export type Service = v.InferOutput<typeof requestServiceSchema>
export type Category = v.InferOutput<typeof requestCategorySchema>

export interface OrderedServicesByType {
    cargo: Service[]
    storage: Service[]
    logistics: Service[]
    port: Service[]
}

export type CargoDetailsOptions = v.InferOutput<typeof cargoDetailsOptionsSchema>
export type CargoDetailsDimensions = v.InferOutput<typeof cargoDetailsDimensionsSchema>
export type CargoDetails = v.InferOutput<typeof cargoDetailsSchema>

export interface SelectedService {
    serviceId: string
    included: boolean
    price: number
}

export interface QuoteData {
    selectedCategories: string[]
    selectedServices: SelectedService[]
    cargoDetails: CargoDetails
    description: string
    vatRate: number
    totalHT: number
    totalTTC: number
    vatAmount: number
    legalDocumentIds: string[]
}
