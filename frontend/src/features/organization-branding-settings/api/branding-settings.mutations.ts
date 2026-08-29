import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as v from "valibot"
import {
    applyOptimisticOrganizationSetupStatusPatch,
    invalidateOrganizationSetupStatus,
    type OrganizationSetupStatusPatch,
    organizationSettingsKeys,
    restoreOrganizationSetupStatus,
} from "@/entities/organization"
import { parseEmptySuccessResponse, parseJsonResponse } from "@/shared/api/http.response"

const organizationPatchResultSchema = v.object({
    success: v.literal(true),
    message: v.optional(v.string()),
})

const organizationLogoMutationResultSchema = v.object({
    success: v.literal(true),
    data: v.object({
        logoUrl: v.string(),
    }),
    message: v.optional(v.string()),
})

type OrganizationPatchResult = v.InferOutput<typeof organizationPatchResultSchema>
type OrganizationLogoMutationResult = v.InferOutput<typeof organizationLogoMutationResultSchema>

async function parseOrganizationMutationResponse(
    res: Response,
    fallback: string
): Promise<OrganizationPatchResult> {
    return parseJsonResponse(res, organizationPatchResultSchema, fallback)
}

async function parseOrganizationLogoMutationResponse(
    res: Response,
    fallback: string
): Promise<OrganizationLogoMutationResult> {
    return parseJsonResponse(res, organizationLogoMutationResultSchema, fallback)
}

interface UpdateOrganizationFieldOptions {
    invalidateOnSuccess?: boolean
}

function getSetupStatusPatchFromOrganizationFields(
    fields: Record<string, unknown>
): OrganizationSetupStatusPatch | null {
    const patch: OrganizationSetupStatusPatch = {}

    if (Object.hasOwn(fields, "tagline")) {
        patch.hasTagline = typeof fields.tagline === "string" && fields.tagline.trim().length > 0
    }

    if (Object.hasOwn(fields, "overview")) {
        patch.hasOverview = typeof fields.overview === "string" && fields.overview.trim().length > 0
    }

    return Object.keys(patch).length > 0 ? patch : null
}

export function useUpdateOrganizationField(
    orgId: string,
    options: UpdateOrganizationFieldOptions = {}
) {
    const queryClient = useQueryClient()
    const queryKey = organizationSettingsKeys.detail(orgId)
    const invalidateOnSuccess = options.invalidateOnSuccess ?? true

    return useMutation({
        mutationFn: async (fields: Record<string, unknown>) => {
            const res = await fetch(`/api/organizations/${orgId}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fields),
            })
            return parseOrganizationMutationResponse(res, "Update failed")
        },
        onMutate: async (fields) => {
            const setupPatch = getSetupStatusPatchFromOrganizationFields(fields)
            if (!setupPatch) return undefined

            return applyOptimisticOrganizationSetupStatusPatch(queryClient, orgId, setupPatch)
        },
        onError: (_error, _fields, context) => {
            restoreOrganizationSetupStatus(queryClient, orgId, context)
        },
        onSuccess: () => {
            if (invalidateOnSuccess) {
                queryClient.invalidateQueries({ queryKey })
            }
        },
        onSettled: (_data, _error, fields) => {
            if (getSetupStatusPatchFromOrganizationFields(fields)) {
                invalidateOrganizationSetupStatus(queryClient, orgId)
            }
        },
    })
}

export function useUpdateOrganizationLogo(orgId: string) {
    const queryClient = useQueryClient()
    const queryKey = organizationSettingsKeys.detail(orgId)

    return useMutation({
        mutationFn: async (logoFile: File) => {
            const formData = new FormData()
            formData.append("logo", logoFile)

            const res = await fetch(`/api/organizations/${orgId}/logo`, {
                method: "PATCH",
                credentials: "include",
                body: formData,
            })
            return parseOrganizationLogoMutationResponse(res, "Failed to update logo")
        },
        onMutate: () => {
            return applyOptimisticOrganizationSetupStatusPatch(queryClient, orgId, {
                hasLogo: true,
            })
        },
        onError: (_error, _logoFile, context) => {
            restoreOrganizationSetupStatus(queryClient, orgId, context)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey })
        },
        onSettled: () => {
            invalidateOrganizationSetupStatus(queryClient, orgId)
        },
    })
}

export function useRemoveOrganizationLogo(orgId: string) {
    const queryClient = useQueryClient()
    const queryKey = organizationSettingsKeys.detail(orgId)

    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/organizations/${orgId}/logo`, {
                method: "DELETE",
                credentials: "include",
            })
            await parseEmptySuccessResponse(res, "Failed to remove logo")
        },
        onMutate: () => {
            return applyOptimisticOrganizationSetupStatusPatch(queryClient, orgId, {
                hasLogo: false,
            })
        },
        onError: (_error, _variables, context) => {
            restoreOrganizationSetupStatus(queryClient, orgId, context)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey })
        },
        onSettled: () => {
            invalidateOrganizationSetupStatus(queryClient, orgId)
        },
    })
}
