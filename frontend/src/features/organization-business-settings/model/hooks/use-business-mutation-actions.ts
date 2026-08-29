import { useQueryClient } from "@tanstack/react-query"
import { type Dispatch, type SetStateAction, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { type OrganizationInfo, organizationSettingsKeys } from "@/entities/organization"
import type { OrganizationBusinessCatalogItem } from "@/entities/organization-business-catalog"
import { getErrorMessage } from "@/shared/lib/error"
import { showPromiseToast, showSuccessToast } from "@/shared/ui/toasts"
import {
    useSaveOrganizationCategories,
    useSaveOrganizationServices,
    useToggleEmailIntake,
} from "../../api/business-settings.mutations"

interface CatalogMutationBody {
    add?: string[]
    remove?: string[]
}

interface UseBusinessMutationActionsOptions {
    organizationId: string
    organizationSlug: string
    allCategories: OrganizationBusinessCatalogItem[]
    selectedCategories: string[]
    setShowCategoriesModal: Dispatch<SetStateAction<boolean>>
    allServices: OrganizationBusinessCatalogItem[]
    selectedServices: string[]
    setShowServicesModal: Dispatch<SetStateAction<boolean>>
    emailIntakeEnabled: boolean
}

interface UseBusinessMutationActionsResult {
    saveCategories: () => void
    saveServices: () => void
    toggleEmailIntake: (enabled: boolean) => void
    isCategoriesMutating: boolean
    isServicesMutating: boolean
    isEmailIntakeMutating: boolean
}

const EMAIL_INTAKE_SAVE_TOAST_ID = "organization-email-intake-save"

export function useBusinessMutationActions({
    organizationId,
    organizationSlug,
    allCategories,
    selectedCategories,
    setShowCategoriesModal,
    allServices,
    selectedServices,
    setShowServicesModal,
    emailIntakeEnabled,
}: UseBusinessMutationActionsOptions): UseBusinessMutationActionsResult {
    const { t } = useTranslation("settings")
    const queryClient = useQueryClient()
    const organizationInfoQueryKey = organizationSettingsKeys.detail(organizationId)
    const categoriesMutation = useSaveOrganizationCategories(organizationId)
    const servicesMutation = useSaveOrganizationServices(organizationId)
    const emailIntakeMutation = useToggleEmailIntake(organizationId)
    const emailIntakeSaveRequestRef = useRef(0)

    const saveCategories = useCallback(() => {
        const initiallySelected = getSelectedCatalogItemIds(allCategories)

        const toAdd = selectedCategories.filter((id) => !initiallySelected.includes(id))
        const toRemove = initiallySelected.filter((id) => !selectedCategories.includes(id))

        if (toAdd.length === 0 && toRemove.length === 0) {
            showSuccessToast(t("business.toast.noChanges"))
            setShowCategoriesModal(false)
            return
        }

        const body = buildCatalogMutationBody(initiallySelected, selectedCategories)
        const promise = categoriesMutation.mutateAsync(body)

        setShowCategoriesModal(false)

        showPromiseToast(promise, {
            loading: t("business.toast.cargoSaving"),
            success: t("business.toast.cargoUpdated"),
            error: (error) => getErrorMessage(error, t("business.toast.cargoFailed")),
            successAction: {
                label: t("branding.toast.viewHomePage"),
                href: `/org/${organizationSlug}`,
            },
        })
    }, [
        allCategories,
        selectedCategories,
        categoriesMutation,
        organizationSlug,
        setShowCategoriesModal,
        t,
    ])

    const saveServices = useCallback(() => {
        const initiallySelected = getSelectedCatalogItemIds(allServices)

        const toAdd = selectedServices.filter((id) => !initiallySelected.includes(id))
        const toRemove = initiallySelected.filter((id) => !selectedServices.includes(id))

        if (toAdd.length === 0 && toRemove.length === 0) {
            showSuccessToast(t("business.toast.noChanges"))
            setShowServicesModal(false)
            return
        }

        const body = buildCatalogMutationBody(initiallySelected, selectedServices)
        const promise = servicesMutation.mutateAsync(body)

        setShowServicesModal(false)

        showPromiseToast(promise, {
            loading: t("business.toast.servicesSaving"),
            success: t("business.toast.servicesUpdated"),
            error: (error) => getErrorMessage(error, t("business.toast.servicesFailed")),
            successAction: {
                label: t("branding.toast.viewHomePage"),
                href: `/org/${organizationSlug}`,
            },
        })
    }, [allServices, selectedServices, servicesMutation, organizationSlug, setShowServicesModal, t])

    const toggleEmailIntake = useCallback(
        (value: boolean) => {
            if (value === emailIntakeEnabled) return

            const requestId = emailIntakeSaveRequestRef.current + 1
            emailIntakeSaveRequestRef.current = requestId
            const previousOrganizationInfo =
                queryClient.getQueryData<OrganizationInfo>(organizationInfoQueryKey)
            const isLatestRequest = () => requestId === emailIntakeSaveRequestRef.current

            void queryClient.cancelQueries({ queryKey: organizationInfoQueryKey })
            queryClient.setQueryData<OrganizationInfo>(
                organizationInfoQueryKey,
                (currentOrganizationInfo) =>
                    currentOrganizationInfo
                        ? { ...currentOrganizationInfo, emailIntakeEnabled: value }
                        : currentOrganizationInfo
            )

            const savePromise = emailIntakeMutation.mutateAsync(value).then(
                (result) => {
                    if (!isLatestRequest()) return result

                    queryClient.invalidateQueries({
                        queryKey: organizationInfoQueryKey,
                        refetchType: "none",
                    })
                    return result
                },
                (error: unknown) => {
                    if (isLatestRequest()) {
                        if (previousOrganizationInfo) {
                            queryClient.setQueryData(
                                organizationInfoQueryKey,
                                previousOrganizationInfo
                            )
                        }
                        queryClient.invalidateQueries({ queryKey: organizationInfoQueryKey })
                    }
                    throw error
                }
            )

            showPromiseToast(savePromise, {
                loading: value
                    ? t("business.toast.emailIntakeEnabling")
                    : t("business.toast.emailIntakeDisabling"),
                success: value
                    ? t("business.toast.emailIntakeEnabled")
                    : t("business.toast.emailIntakeDisabled"),
                error: (error) => getErrorMessage(error, t("business.toast.emailIntakeFailed")),
                id: EMAIL_INTAKE_SAVE_TOAST_ID,
                shouldSettle: isLatestRequest,
            })
            savePromise.catch(() => {})
        },
        [emailIntakeEnabled, emailIntakeMutation, organizationInfoQueryKey, queryClient, t]
    )

    return {
        saveCategories,
        saveServices,
        toggleEmailIntake,
        isCategoriesMutating: categoriesMutation.isPending,
        isServicesMutating: servicesMutation.isPending,
        isEmailIntakeMutating: emailIntakeMutation.isPending,
    }
}

function getSelectedCatalogItemIds<TCatalogItem extends { id: string; isSelected?: boolean }>(
    items: TCatalogItem[]
): string[] {
    return items.filter((item) => item.isSelected).map((item) => item.id)
}

function buildCatalogMutationBody(
    initiallySelected: string[],
    selectedItems: string[]
): CatalogMutationBody {
    const toAdd = selectedItems.filter((id) => !initiallySelected.includes(id))
    const toRemove = initiallySelected.filter((id) => !selectedItems.includes(id))
    const body: CatalogMutationBody = {}

    if (toAdd.length > 0) body.add = toAdd
    if (toRemove.length > 0) body.remove = toRemove

    return body
}
