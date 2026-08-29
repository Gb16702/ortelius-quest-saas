import type { QueryClient } from "@tanstack/react-query"
import {
    type OrganizationSetupStatus,
    resolveOrganizationSetupCompletion,
} from "../model/organization-setup"
import { organizationSetupKeys } from "./organization-setup.query"

export type OrganizationSetupStatusPatch = Partial<
    Pick<
        OrganizationSetupStatus,
        | "hasLogo"
        | "hasTagline"
        | "hasOverview"
        | "hasServices"
        | "hasCargoTypes"
        | "hasVatConfig"
        | "hasLegalDocuments"
        | "memberCount"
    >
>

export interface OrganizationSetupStatusPatchContext {
    previousSetupStatus?: OrganizationSetupStatus
}

export async function applyOptimisticOrganizationSetupStatusPatch(
    queryClient: QueryClient,
    organizationId: string,
    patch: OrganizationSetupStatusPatch
): Promise<OrganizationSetupStatusPatchContext> {
    const queryKey = organizationSetupKeys.detail(organizationId)
    await queryClient.cancelQueries({ queryKey })
    const previousSetupStatus = queryClient.getQueryData<OrganizationSetupStatus>(queryKey)

    queryClient.setQueryData<OrganizationSetupStatus>(queryKey, (currentStatus) => {
        if (!currentStatus) return currentStatus

        const nextStatus = { ...currentStatus, ...patch }
        return {
            ...nextStatus,
            isComplete: resolveOrganizationSetupCompletion(nextStatus),
        }
    })

    return { previousSetupStatus }
}

export function restoreOrganizationSetupStatus(
    queryClient: QueryClient,
    organizationId: string,
    context: OrganizationSetupStatusPatchContext | undefined
) {
    if (context?.previousSetupStatus) {
        queryClient.setQueryData(
            organizationSetupKeys.detail(organizationId),
            context.previousSetupStatus
        )
    }
}

export function invalidateOrganizationSetupStatus(
    queryClient: QueryClient,
    organizationId: string
) {
    queryClient.invalidateQueries({ queryKey: organizationSetupKeys.detail(organizationId) })
}
