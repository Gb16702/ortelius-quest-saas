import { type FormStore, reset, useForm } from "@formisch/react"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useRouter } from "@tanstack/react-router"
import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
    applyOrganizationFontToDocument,
    checkOrganizationSlug,
    createOrganizationBrandColorCssVariables,
    normalizeWebsite,
    type OrganizationBrandColor,
    type OrganizationBrandingSettings,
    type OrganizationFontId,
    type OrganizationInfo,
    type OrganizationNameFormData,
    type OrganizationWorkspaceUrlFormData,
    type OverviewFormData,
    organizationNameSchema,
    organizationSettingsKeys,
    organizationWorkspaceBootstrapKeys,
    organizationWorkspaceUrlSchema,
    overviewSchema,
    type TaglineFormData,
    taglineSchema,
    useOrgOptional,
    type WebsiteFormData,
    websiteSchema,
} from "@/entities/organization"
import { getErrorMessage } from "@/shared/lib/error"
import { showErrorToast, showPromiseToast, showSuccessToast } from "@/shared/ui/toasts"
import {
    useRemoveOrganizationLogo,
    useUpdateOrganizationField,
    useUpdateOrganizationLogo,
} from "../api/branding-settings.mutations"
import { getBrandingLogoFileValidationError } from "../lib/branding-logo-upload"

interface BrandingPageState {
    organizationData: OrganizationBrandingSettings
    orgLogoImageSrc: string | null
    showOrgLogoCropper: boolean
    showOverviewDialog: boolean
    showWorkspaceUrlDialog: boolean
    workspaceUrlServerError: string | null
    organizationNameForm: FormStore<typeof organizationNameSchema>
    workspaceUrlForm: FormStore<typeof organizationWorkspaceUrlSchema>
    taglineForm: FormStore<typeof taglineSchema>
    overviewForm: FormStore<typeof overviewSchema>
    websiteForm: FormStore<typeof websiteSchema>
    organizationNameMutationPending: boolean
    workspaceUrlMutationPending: boolean
    taglineMutationPending: boolean
    overviewMutationPending: boolean
    websiteMutationPending: boolean
    brandColorMutationPending: boolean
    fontMutationPending: boolean
}

interface BrandingPageActions {
    saveOrganizationName: (data: OrganizationNameFormData) => void
    saveWorkspaceUrl: (data: OrganizationWorkspaceUrlFormData) => Promise<void>
    saveTagline: (data: TaglineFormData) => void
    saveOverview: (data: OverviewFormData) => void
    saveWebsite: (data: WebsiteFormData) => void
    saveOrganizationBrandColor: (brandColor: OrganizationBrandColor) => void
    saveOrganizationFont: (font: OrganizationFontId) => void
    removeOrgLogo: () => void
    handleLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleLogoCropSave: (croppedFile: File) => void
    handleLogoCropCancel: () => void
    openOverviewDialog: () => void
    closeOverviewDialog: () => void
    openWorkspaceUrlDialog: () => void
    closeWorkspaceUrlDialog: () => void
    clearWorkspaceUrlServerError: () => void
}

interface BrandingPageContextValue {
    state: BrandingPageState
    actions: BrandingPageActions
}

const BrandingPageContext = createContext<BrandingPageContextValue | null>(null)
const BRAND_COLOR_SAVE_TOAST_ID = "organization-brand-color-save"
const FONT_SAVE_TOAST_ID = "organization-font-save"
const WORKSPACE_URL_SAVE_TOAST_ID = "organization-workspace-url-save"

function normalizeHash(hash: string): string {
    if (!hash) return ""
    return hash.startsWith("#") ? hash : `#${hash}`
}

function replaceOrgSlugInHref({
    pathname,
    search,
    hash,
    fromSlug,
    toSlug,
}: {
    pathname: string
    search: string
    hash: string
    fromSlug: string
    toSlug: string
}): string {
    const prefix = `/org/${fromSlug}`
    const isCurrentOrgPath = pathname === prefix || pathname.startsWith(`${prefix}/`)
    const nextPathname = isCurrentOrgPath
        ? `/org/${toSlug}${pathname.slice(prefix.length)}`
        : `/org/${toSlug}/settings/branding`

    return `${nextPathname}${search}${normalizeHash(hash)}`
}

function applyOrganizationFontPreview(font: OrganizationFontId) {
    applyOrganizationFontToDocument(font)
}

function applyOrganizationBrandColorPreview(brandColor: OrganizationBrandColor) {
    const variables = createOrganizationBrandColorCssVariables(brandColor)
    const rootStyle = document.documentElement.style

    for (const [name, value] of Object.entries(variables)) {
        rootStyle.setProperty(name, String(value))
    }
}

export function useBrandingPage(): BrandingPageContextValue {
    const ctx = use(BrandingPageContext)
    if (!ctx) {
        throw new Error("useBrandingPage must be used within BrandingPageProvider")
    }
    return ctx
}

interface BrandingPageProviderProps {
    orgInfo: OrganizationBrandingSettings
    children: ReactNode
}

export function BrandingPageProvider({ orgInfo, children }: BrandingPageProviderProps) {
    const { t } = useTranslation("settings")
    const router = useRouter()
    const location = useLocation({
        select: (currentLocation) => ({
            pathname: currentLocation.pathname,
            search: currentLocation.searchStr,
            hash: currentLocation.hash,
        }),
    })
    const queryClient = useQueryClient()
    const orgContext = useOrgOptional()
    const organizationData = orgInfo
    const organizationInfoQueryKey = useMemo(
        () => organizationSettingsKeys.detail(organizationData.id),
        [organizationData.id]
    )

    const [orgLogoImageSrc, setOrgLogoImageSrc] = useState<string | null>(null)
    const [showOrgLogoCropper, setShowOrgLogoCropper] = useState(false)
    const [showOverviewDialog, setShowOverviewDialog] = useState(false)
    const [showWorkspaceUrlDialog, setShowWorkspaceUrlDialog] = useState(false)
    const [workspaceUrlServerError, setWorkspaceUrlServerError] = useState<string | null>(null)
    const orgLogoObjectUrlRef = useRef<string | null>(null)
    const brandColorSaveRequestRef = useRef(0)
    const fontSaveRequestRef = useRef(0)

    const organizationNameMutation = useUpdateOrganizationField(organizationData.id)
    const workspaceUrlMutation = useUpdateOrganizationField(organizationData.id)
    const taglineMutation = useUpdateOrganizationField(organizationData.id)
    const overviewMutation = useUpdateOrganizationField(organizationData.id)
    const websiteMutation = useUpdateOrganizationField(organizationData.id)
    const brandColorMutation = useUpdateOrganizationField(organizationData.id, {
        invalidateOnSuccess: false,
    })
    const fontMutation = useUpdateOrganizationField(organizationData.id, {
        invalidateOnSuccess: false,
    })
    const uploadLogoMutation = useUpdateOrganizationLogo(organizationData.id)
    const removeLogoMutation = useRemoveOrganizationLogo(organizationData.id)
    const organizationNameInitialInput = useMemo(
        () => ({ name: organizationData?.name ?? "" }),
        [organizationData?.name]
    )
    const workspaceUrlInitialInput = useMemo(
        () => ({ slug: organizationData?.slug ?? "" }),
        [organizationData?.slug]
    )
    const taglineInitialInput = useMemo(
        () => ({ tagline: organizationData?.tagline ?? "" }),
        [organizationData?.tagline]
    )
    const overviewInitialInput = useMemo(
        () => ({ overview: organizationData?.overview ?? "" }),
        [organizationData?.overview]
    )
    const websiteInitialInput = useMemo(
        () => ({ website: normalizeWebsite(organizationData?.website) }),
        [organizationData?.website]
    )

    const organizationNameForm = useForm({
        schema: organizationNameSchema,
        initialInput: organizationNameInitialInput,
        validate: "submit",
    })

    const workspaceUrlForm = useForm({
        schema: organizationWorkspaceUrlSchema,
        initialInput: workspaceUrlInitialInput,
        validate: "submit",
    })

    const taglineForm = useForm({
        schema: taglineSchema,
        initialInput: taglineInitialInput,
        validate: "submit",
    })

    const overviewForm = useForm({
        schema: overviewSchema,
        initialInput: overviewInitialInput,
        validate: "submit",
    })

    const websiteForm = useForm({
        schema: websiteSchema,
        initialInput: websiteInitialInput,
        validate: "submit",
    })

    useEffect(() => {
        reset(organizationNameForm, { initialInput: organizationNameInitialInput })
    }, [organizationNameForm, organizationNameInitialInput])

    useEffect(() => {
        reset(workspaceUrlForm, { initialInput: workspaceUrlInitialInput })
    }, [workspaceUrlForm, workspaceUrlInitialInput])

    useEffect(() => {
        reset(taglineForm, { initialInput: taglineInitialInput })
    }, [taglineForm, taglineInitialInput])

    useEffect(() => {
        reset(overviewForm, { initialInput: overviewInitialInput })
    }, [overviewForm, overviewInitialInput])

    useEffect(() => {
        reset(websiteForm, { initialInput: websiteInitialInput })
    }, [websiteForm, websiteInitialInput])

    const invalidateWorkspaceShell = useCallback(() => {
        void router.invalidate()
    }, [router])

    const updateOrganizationNameCache = useCallback(
        (name: string) => {
            queryClient.setQueryData<OrganizationInfo>(
                organizationInfoQueryKey,
                (currentOrganizationInfo) =>
                    currentOrganizationInfo
                        ? { ...currentOrganizationInfo, name }
                        : currentOrganizationInfo
            )
        },
        [organizationInfoQueryKey, queryClient]
    )

    const updateWorkspaceUrlCache = useCallback(
        (slug: string) => {
            queryClient.setQueryData<OrganizationInfo>(
                organizationInfoQueryKey,
                (currentOrganizationInfo) =>
                    currentOrganizationInfo
                        ? { ...currentOrganizationInfo, slug }
                        : currentOrganizationInfo
            )
        },
        [organizationInfoQueryKey, queryClient]
    )

    const saveOrganizationName = useCallback(
        (data: OrganizationNameFormData) => {
            const name = data.name.trim()
            if (name === organizationData.name) return

            organizationNameMutation.mutate(
                { name },
                {
                    onSuccess: () => {
                        updateOrganizationNameCache(name)
                        orgContext?.actions.applyOrganizationUpdate({ name })
                        showSuccessToast(t("branding.toast.nameUpdated"))
                        reset(organizationNameForm, { initialInput: { name } })
                    },
                    onError: (error) => showErrorToast(error.message),
                }
            )
        },
        [
            organizationData.name,
            organizationNameForm,
            organizationNameMutation,
            orgContext?.actions,
            t,
            updateOrganizationNameCache,
        ]
    )

    const openWorkspaceUrlDialog = useCallback(() => {
        setWorkspaceUrlServerError(null)
        reset(workspaceUrlForm, { initialInput: workspaceUrlInitialInput })
        setShowWorkspaceUrlDialog(true)
    }, [workspaceUrlForm, workspaceUrlInitialInput])

    const closeWorkspaceUrlDialog = useCallback(() => {
        setShowWorkspaceUrlDialog(false)
        setWorkspaceUrlServerError(null)
        reset(workspaceUrlForm)
    }, [workspaceUrlForm])

    const clearWorkspaceUrlServerError = useCallback(() => {
        setWorkspaceUrlServerError(null)
    }, [])

    const saveWorkspaceUrl = useCallback(
        async (data: OrganizationWorkspaceUrlFormData) => {
            const slug = data.slug.trim()
            const currentSlug = orgContext?.meta.slug ?? organizationData.slug ?? ""
            setWorkspaceUrlServerError(null)

            if (slug === currentSlug) {
                closeWorkspaceUrlDialog()
                return
            }

            closeWorkspaceUrlDialog()

            let didApplyOptimisticSlug = false
            const previousOrganizationInfo =
                queryClient.getQueryData<OrganizationInfo>(organizationInfoQueryKey)
            const previousHref = `${location.pathname}${location.search}${normalizeHash(location.hash)}`
            const nextHref = replaceOrgSlugInHref({
                pathname: location.pathname,
                search: location.search,
                hash: location.hash,
                fromSlug: currentSlug,
                toSlug: slug,
            })

            const savePromise = (async () => {
                const availability = await checkOrganizationSlug(slug)
                if (!availability.available) {
                    const message = t(`branding.workspaceUrl.errors.${availability.errorCode}`, {
                        defaultValue: t("branding.workspaceUrl.errors.INVALID_FORMAT"),
                    })
                    throw new Error(message)
                }

                updateWorkspaceUrlCache(slug)
                orgContext?.actions.applyOrganizationUpdate({
                    slug,
                    previousSlug: currentSlug,
                })
                didApplyOptimisticSlug = true
                reset(workspaceUrlForm, { initialInput: { slug } })
                void router.navigate({ href: nextHref, replace: true })

                await workspaceUrlMutation.mutateAsync({ slug })

                if (currentSlug) {
                    void queryClient.invalidateQueries({
                        queryKey: organizationWorkspaceBootstrapKeys.detail(currentSlug),
                        refetchType: "none",
                    })
                }
                void queryClient.invalidateQueries({
                    queryKey: organizationWorkspaceBootstrapKeys.detail(slug),
                    refetchType: "none",
                })
                void queryClient.invalidateQueries({
                    queryKey: organizationInfoQueryKey,
                    refetchType: "none",
                })
            })()

            showPromiseToast(savePromise, {
                loading: t("branding.toast.workspaceUrlSaving"),
                success: t("branding.toast.workspaceUrlUpdated"),
                error: (error) => getErrorMessage(error, t("branding.toast.workspaceUrlFailed")),
                id: WORKSPACE_URL_SAVE_TOAST_ID,
            })

            try {
                await savePromise
            } catch {
                if (!didApplyOptimisticSlug) return

                if (previousOrganizationInfo) {
                    queryClient.setQueryData(organizationInfoQueryKey, previousOrganizationInfo)
                }
                orgContext?.actions.applyOrganizationUpdate({
                    slug: currentSlug,
                    previousSlug: slug,
                })
                reset(workspaceUrlForm, { initialInput: { slug: currentSlug } })
                void router.navigate({ href: previousHref, replace: true })
            }
        },
        [
            closeWorkspaceUrlDialog,
            location.hash,
            location.pathname,
            location.search,
            organizationData.slug,
            organizationInfoQueryKey,
            orgContext?.actions,
            orgContext?.meta.slug,
            queryClient,
            router,
            t,
            updateWorkspaceUrlCache,
            workspaceUrlForm,
            workspaceUrlMutation,
        ]
    )

    const saveTagline = useCallback(
        (data: TaglineFormData) => {
            taglineMutation.mutate(
                { tagline: data.tagline || null },
                {
                    onSuccess: () => {
                        showSuccessToast(t("branding.toast.taglineUpdated"), {
                            action: {
                                label: t("branding.toast.viewHomePage"),
                                href: `/org/${organizationData.slug}`,
                            },
                        })
                        reset(taglineForm, { initialInput: data })
                    },
                    onError: (error) => showErrorToast(error.message),
                }
            )
        },
        [taglineMutation, taglineForm, organizationData.slug, t]
    )

    const saveOverview = useCallback(
        (data: OverviewFormData) => {
            setShowOverviewDialog(false)
            const promise = overviewMutation.mutateAsync({ overview: data.overview || null })
            showPromiseToast(promise, {
                loading: t("branding.toast.overviewSaving"),
                success: t("branding.toast.overviewUpdated"),
                error: (err) => getErrorMessage(err, t("branding.toast.overviewFailed")),
                successAction: {
                    label: t("branding.toast.viewHomePage"),
                    href: `/org/${organizationData.slug}`,
                },
            })
            promise.catch(() => {})
        },
        [overviewMutation, organizationData.slug, t]
    )

    const openOverviewDialog = useCallback(() => setShowOverviewDialog(true), [])
    const closeOverviewDialog = useCallback(() => {
        setShowOverviewDialog(false)
        reset(overviewForm)
    }, [overviewForm])

    const saveWebsite = useCallback(
        (data: WebsiteFormData) => {
            const normalized = normalizeWebsite(data.website)
            websiteMutation.mutate(
                { website: normalized || null },
                {
                    onSuccess: () => {
                        showSuccessToast(t("branding.toast.websiteUpdated"), {
                            action: {
                                label: t("branding.toast.viewHomePage"),
                                href: `/org/${organizationData.slug}`,
                            },
                        })
                        reset(websiteForm, { initialInput: { website: normalized } })
                    },
                    onError: (error) => showErrorToast(error.message),
                }
            )
        },
        [websiteMutation, websiteForm, organizationData.slug, t]
    )

    const updateFontCache = useCallback(
        (font: OrganizationFontId) => {
            queryClient.setQueryData<OrganizationInfo>(
                organizationInfoQueryKey,
                (currentOrganizationInfo) =>
                    currentOrganizationInfo
                        ? { ...currentOrganizationInfo, font }
                        : currentOrganizationInfo
            )
        },
        [organizationInfoQueryKey, queryClient]
    )

    const updateBrandColorCache = useCallback(
        (brandColor: OrganizationBrandColor) => {
            queryClient.setQueryData<OrganizationInfo>(
                organizationInfoQueryKey,
                (currentOrganizationInfo) =>
                    currentOrganizationInfo
                        ? { ...currentOrganizationInfo, brandColor }
                        : currentOrganizationInfo
            )
        },
        [organizationInfoQueryKey, queryClient]
    )

    const saveOrganizationBrandColor = useCallback(
        (brandColor: OrganizationBrandColor) => {
            if (brandColor === organizationData.brandColor) return

            const requestId = brandColorSaveRequestRef.current + 1
            brandColorSaveRequestRef.current = requestId
            const previousOrganizationInfo =
                queryClient.getQueryData<OrganizationInfo>(organizationInfoQueryKey)

            applyOrganizationBrandColorPreview(brandColor)
            updateBrandColorCache(brandColor)
            const isLatestRequest = () => requestId === brandColorSaveRequestRef.current
            const savePromise = brandColorMutation.mutateAsync({ brandColor }).then(
                (result) => {
                    if (!isLatestRequest()) return result

                    if (organizationData.slug) {
                        void queryClient.invalidateQueries({
                            queryKey: organizationWorkspaceBootstrapKeys.detail(
                                organizationData.slug
                            ),
                            refetchType: "none",
                        })
                    }
                    queryClient.invalidateQueries({
                        queryKey: organizationInfoQueryKey,
                        refetchType: "none",
                    })
                    invalidateWorkspaceShell()
                    return result
                },
                (error: unknown) => {
                    if (isLatestRequest()) {
                        if (previousOrganizationInfo) {
                            queryClient.setQueryData(
                                organizationInfoQueryKey,
                                previousOrganizationInfo
                            )
                            applyOrganizationBrandColorPreview(previousOrganizationInfo.brandColor)
                        }
                        queryClient.invalidateQueries({ queryKey: organizationInfoQueryKey })
                    }
                    throw error
                }
            )

            showPromiseToast(savePromise, {
                loading: t("branding.toast.brandColorSaving"),
                success: t("branding.toast.brandColorUpdated"),
                error: (error) => getErrorMessage(error, t("branding.toast.brandColorFailed")),
                id: BRAND_COLOR_SAVE_TOAST_ID,
                shouldSettle: isLatestRequest,
            })
            savePromise.catch(() => {})
        },
        [
            brandColorMutation,
            invalidateWorkspaceShell,
            organizationData.brandColor,
            organizationData.slug,
            organizationInfoQueryKey,
            queryClient,
            updateBrandColorCache,
            t,
        ]
    )

    const saveOrganizationFont = useCallback(
        (font: OrganizationFontId) => {
            if (font === organizationData.font) return

            const requestId = fontSaveRequestRef.current + 1
            fontSaveRequestRef.current = requestId
            const previousOrganizationInfo =
                queryClient.getQueryData<OrganizationInfo>(organizationInfoQueryKey)

            applyOrganizationFontPreview(font)
            updateFontCache(font)
            const isLatestRequest = () => requestId === fontSaveRequestRef.current
            const savePromise = fontMutation.mutateAsync({ font }).then(
                (result) => {
                    if (!isLatestRequest()) return result

                    if (organizationData.slug) {
                        void queryClient.invalidateQueries({
                            queryKey: organizationWorkspaceBootstrapKeys.detail(
                                organizationData.slug
                            ),
                            refetchType: "none",
                        })
                    }
                    queryClient.invalidateQueries({
                        queryKey: organizationInfoQueryKey,
                        refetchType: "none",
                    })
                    invalidateWorkspaceShell()
                    return result
                },
                (error: unknown) => {
                    if (isLatestRequest()) {
                        if (previousOrganizationInfo) {
                            queryClient.setQueryData(
                                organizationInfoQueryKey,
                                previousOrganizationInfo
                            )
                            applyOrganizationFontPreview(previousOrganizationInfo.font)
                        }
                        queryClient.invalidateQueries({ queryKey: organizationInfoQueryKey })
                    }
                    throw error
                }
            )

            showPromiseToast(savePromise, {
                loading: t("branding.toast.fontSaving"),
                success: t("branding.toast.fontUpdated"),
                error: (error) => getErrorMessage(error, t("branding.toast.fontFailed")),
                id: FONT_SAVE_TOAST_ID,
                shouldSettle: isLatestRequest,
            })
            savePromise.catch(() => {})
        },
        [
            fontMutation,
            invalidateWorkspaceShell,
            organizationData.font,
            organizationData.slug,
            organizationInfoQueryKey,
            queryClient,
            updateFontCache,
            t,
        ]
    )

    const removeOrgLogo = useCallback(() => {
        const promise = removeLogoMutation.mutateAsync().then((result) => {
            orgContext?.actions.applyOrganizationUpdate({ logo: null })
            return result
        })

        showPromiseToast(promise, {
            loading: t("branding.toast.logoRemoving"),
            success: t("branding.toast.logoRemoved"),
            error: (err) => getErrorMessage(err, t("branding.toast.logoRemoveFailed")),
            successAction: {
                label: t("branding.toast.viewHomePage"),
                href: `/org/${organizationData.slug}`,
            },
        })
    }, [removeLogoMutation, organizationData.slug, orgContext?.actions, t])

    const revokeOrgLogoObjectUrl = useCallback(() => {
        if (!orgLogoObjectUrlRef.current) return

        URL.revokeObjectURL(orgLogoObjectUrlRef.current)
        orgLogoObjectUrlRef.current = null
    }, [])

    const clearOrgLogoPreview = useCallback(() => {
        revokeOrgLogoObjectUrl()
        setOrgLogoImageSrc(null)
    }, [revokeOrgLogoObjectUrl])

    useEffect(() => () => revokeOrgLogoObjectUrl(), [revokeOrgLogoObjectUrl])

    const handleLogoFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const input = e.currentTarget
            const file = input.files?.[0]

            if (!file) return

            const validationError = getBrandingLogoFileValidationError(file)
            input.value = ""

            if (validationError) {
                setShowOrgLogoCropper(false)
                clearOrgLogoPreview()
                showErrorToast(validationError)
                return
            }

            clearOrgLogoPreview()
            const objectUrl = URL.createObjectURL(file)
            orgLogoObjectUrlRef.current = objectUrl
            setOrgLogoImageSrc(objectUrl)
            setShowOrgLogoCropper(true)
        },
        [clearOrgLogoPreview]
    )

    const handleLogoCropSave = useCallback(
        (croppedFile: File) => {
            setShowOrgLogoCropper(false)
            clearOrgLogoPreview()

            const promise = uploadLogoMutation.mutateAsync(croppedFile).then((result) => {
                orgContext?.actions.applyOrganizationUpdate({ logo: result.data.logoUrl })
                return result
            })

            showPromiseToast(promise, {
                loading: t("branding.toast.logoUploading"),
                success: t("branding.toast.logoUpdated"),
                error: (err) => getErrorMessage(err, t("branding.toast.logoUpdateFailed")),
                successAction: {
                    label: t("branding.toast.viewHomePage"),
                    href: `/org/${organizationData.slug}`,
                },
            })
        },
        [clearOrgLogoPreview, uploadLogoMutation, organizationData.slug, orgContext?.actions, t]
    )

    const handleLogoCropCancel = useCallback(() => {
        setShowOrgLogoCropper(false)
        clearOrgLogoPreview()
    }, [clearOrgLogoPreview])

    const value = useMemo(
        (): BrandingPageContextValue => ({
            state: {
                organizationData,
                orgLogoImageSrc,
                showOrgLogoCropper,
                showOverviewDialog,
                showWorkspaceUrlDialog,
                workspaceUrlServerError,
                organizationNameForm,
                workspaceUrlForm,
                taglineForm,
                overviewForm,
                websiteForm,
                organizationNameMutationPending: organizationNameMutation.isPending,
                workspaceUrlMutationPending: workspaceUrlMutation.isPending,
                taglineMutationPending: taglineMutation.isPending,
                overviewMutationPending: overviewMutation.isPending,
                websiteMutationPending: websiteMutation.isPending,
                brandColorMutationPending: brandColorMutation.isPending,
                fontMutationPending: fontMutation.isPending,
            },
            actions: {
                saveOrganizationName,
                saveWorkspaceUrl,
                saveTagline,
                saveOverview,
                saveWebsite,
                saveOrganizationBrandColor,
                saveOrganizationFont,
                removeOrgLogo,
                handleLogoFileChange,
                handleLogoCropSave,
                handleLogoCropCancel,
                openOverviewDialog,
                closeOverviewDialog,
                openWorkspaceUrlDialog,
                closeWorkspaceUrlDialog,
                clearWorkspaceUrlServerError,
            },
        }),
        [
            organizationData,
            orgLogoImageSrc,
            showOrgLogoCropper,
            showOverviewDialog,
            showWorkspaceUrlDialog,
            workspaceUrlServerError,
            organizationNameForm,
            workspaceUrlForm,
            taglineForm,
            overviewForm,
            websiteForm,
            organizationNameMutation.isPending,
            workspaceUrlMutation.isPending,
            taglineMutation.isPending,
            overviewMutation.isPending,
            websiteMutation.isPending,
            brandColorMutation.isPending,
            fontMutation.isPending,
            handleLogoCropCancel,
            handleLogoCropSave,
            handleLogoFileChange,
            removeOrgLogo,
            openOverviewDialog,
            closeOverviewDialog,
            openWorkspaceUrlDialog,
            closeWorkspaceUrlDialog,
            clearWorkspaceUrlServerError,
            saveOrganizationName,
            saveWorkspaceUrl,
            saveOverview,
            saveOrganizationBrandColor,
            saveOrganizationFont,
            saveTagline,
            saveWebsite,
        ]
    )

    return <BrandingPageContext value={value}>{children}</BrandingPageContext>
}
