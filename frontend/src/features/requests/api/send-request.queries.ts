import { useQuery } from "@tanstack/react-query"
import type { Category, OrderedServicesByType, Service } from "../model/request"
import { categoriesResponseSchema, servicesResponseSchema } from "../model/schemas/request.schema"
import { parseJsonResponse } from "./request.response"
import { requestsKeys } from "./requests.api"

export function useCategories(organizationId: string | null, enabled: boolean) {
    return useQuery<Category[]>({
        queryKey: requestsKeys.categories(organizationId),
        queryFn: async () => {
            if (!organizationId) throw new Error("Organization ID is required")
            const res = await fetch(`/api/categories/organizations/${organizationId}`, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            const json = await parseJsonResponse(
                res,
                categoriesResponseSchema,
                "Failed to fetch categories"
            )

            return json.data
        },
        enabled: enabled && !!organizationId,
        staleTime: 5 * 60 * 1000,
    })
}

export function useServices(organizationId: string | null, enabled: boolean) {
    return useQuery<OrderedServicesByType>({
        queryKey: requestsKeys.services(organizationId),
        queryFn: async () => {
            if (!organizationId) throw new Error("Organization ID is required")
            const res = await fetch(`/api/services/organizations/${organizationId}`, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            const json = await parseJsonResponse(
                res,
                servicesResponseSchema,
                "Failed to fetch services"
            )

            const services: Service[] = json.data
            const grouped: OrderedServicesByType = {
                cargo: [],
                storage: [],
                logistics: [],
                port: [],
            }

            for (const service of services) {
                if (service.type in grouped) {
                    grouped[service.type].push(service)
                }
            }

            return grouped
        },
        enabled: enabled && !!organizationId,
        staleTime: 5 * 60 * 1000,
    })
}
