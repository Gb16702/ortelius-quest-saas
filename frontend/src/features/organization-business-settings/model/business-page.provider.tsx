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
import type { OrganizationBusinessSettings } from "@/entities/organization"
import {
    type OrganizationBusinessCatalogItem,
    organizationBusinessCatalogKeys,
    useOrganizationCategories,
    useOrganizationServices,
} from "@/entities/organization-business-catalog"
import { getErrorMessage } from "@/shared/lib/error"
import {
    getQueryPrimaryDataSource,
    type PrimaryDataSource,
} from "@/shared/lib/performance/navigation-metrics"
import { showRetryErrorToast } from "@/shared/ui/toasts"
import { useBusinessMutationActions } from "./hooks/use-business-mutation-actions"

type Category = OrganizationBusinessCatalogItem

type Service = OrganizationBusinessCatalogItem

const EMPTY_BUSINESS_CATALOG_ITEMS: OrganizationBusinessCatalogItem[] = []

interface BusinessPageState {
    organizationData: OrganizationBusinessSettings
    showCategoriesModal: boolean
    showServicesModal: boolean
    showPricingDataDialog: boolean
    allCategories: Category[]
    allServices: Service[]
    activeCategories: Category[]
    activeServices: Service[]
    selectedCategorySet: Set<string>
    selectedServiceSet: Set<string>
    isLoadingCategories: boolean
    isLoadingServices: boolean
    catalogDataSource: PrimaryDataSource
    emailIntakeEnabled: boolean
    isCategoriesMutating: boolean
    isServicesMutating: boolean
    isEmailIntakeMutating: boolean
}

interface BusinessPageActions {
    openCategoriesModal: () => void
    openServicesModal: () => void
    setShowCategoriesModal: (open: boolean) => void
    setShowServicesModal: (open: boolean) => void
    setShowPricingDataDialog: (open: boolean) => void
    saveCategories: () => void
    saveServices: () => void
    toggleCategory: (categoryId: string, checked: boolean) => void
    toggleService: (serviceId: string, checked: boolean) => void
    toggleEmailIntake: (enabled: boolean) => void
    hasCategoriesChanges: () => boolean
    isCategoriesSaveDisabled: () => boolean
    hasServicesChanges: () => boolean
    isServicesSaveDisabled: () => boolean
}

interface BusinessPageMeta {
    organizationId: string
    organizationSlug: string
}

interface BusinessPageContextValue {
    state: BusinessPageState
    actions: BusinessPageActions
    meta: BusinessPageMeta
}

const BusinessPageContext = createContext<BusinessPageContextValue | null>(null)

export function useBusinessPage(): BusinessPageContextValue {
    const ctx = use(BusinessPageContext)
    if (!ctx) {
        throw new Error("useBusinessPage must be used within BusinessPageProvider")
    }
    return ctx
}

interface BusinessPageProviderProps {
    orgInfo: OrganizationBusinessSettings
    initialCategories?: Category[]
    initialServices?: Service[]
    children: ReactNode
}

function getSelectedCatalogItemIds<TCatalogItem extends { id: string; isSelected?: boolean }>(
    items: TCatalogItem[]
): string[] {
    return items.filter((item) => item.isSelected).map((item) => item.id)
}

export function BusinessPageProvider({
    orgInfo,
    initialCategories,
    initialServices,
    children,
}: BusinessPageProviderProps) {
    const { t } = useTranslation("settings")
    const initialCategoryItems = initialCategories ?? EMPTY_BUSINESS_CATALOG_ITEMS
    const initialServiceItems = initialServices ?? EMPTY_BUSINESS_CATALOG_ITEMS
    const organizationData = orgInfo
    const categoriesQuery = useOrganizationCategories(
        organizationData.id,
        initialCategories !== undefined ? { initialData: initialCategories } : undefined
    )
    const servicesQuery = useOrganizationServices(
        organizationData.id,
        initialServices !== undefined ? { initialData: initialServices } : undefined
    )

    const [showCategoriesModal, setShowCategoriesModal] = useState(false)
    const [showServicesModal, setShowServicesModal] = useState(false)
    const [showPricingDataDialog, setShowPricingDataDialog] = useState(false)
    const shouldHydrateCategoriesModalSelectionRef = useRef(false)
    const shouldHydrateServicesModalSelectionRef = useRef(false)
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        initialCategoryItems
            .filter((category) => category.isSelected)
            .map((category) => category.id)
    )
    const [selectedServices, setSelectedServices] = useState<string[]>(
        initialServiceItems.filter((service) => service.isSelected).map((service) => service.id)
    )

    const allCategories = categoriesQuery.data ?? initialCategoryItems
    const allServices = servicesQuery.data ?? initialServiceItems
    const isLoadingCategories = categoriesQuery.isPending && allCategories.length === 0
    const isLoadingServices = servicesQuery.isPending && allServices.length === 0
    const categoryDataSource = getQueryPrimaryDataSource({
        queryKey: organizationBusinessCatalogKeys.categories(organizationData.id),
        hasData: Boolean(categoriesQuery.data),
        isFetchedAfterMount: categoriesQuery.isFetchedAfterMount,
        isFetching: categoriesQuery.isFetching,
        isPlaceholderData: categoriesQuery.isPlaceholderData,
    })
    const serviceDataSource = getQueryPrimaryDataSource({
        queryKey: organizationBusinessCatalogKeys.services(organizationData.id),
        hasData: Boolean(servicesQuery.data),
        isFetchedAfterMount: servicesQuery.isFetchedAfterMount,
        isFetching: servicesQuery.isFetching,
        isPlaceholderData: servicesQuery.isPlaceholderData,
    })
    const catalogDataSource = resolveCatalogDataSource(categoryDataSource, serviceDataSource)
    const emailIntakeEnabled = organizationData.emailIntakeEnabled ?? false

    useEffect(() => {
        if (!showCategoriesModal) {
            shouldHydrateCategoriesModalSelectionRef.current = false
            setSelectedCategories(getSelectedCatalogItemIds(allCategories))
            return
        }

        if (shouldHydrateCategoriesModalSelectionRef.current && allCategories.length > 0) {
            shouldHydrateCategoriesModalSelectionRef.current = false
            setSelectedCategories(getSelectedCatalogItemIds(allCategories))
        }
    }, [allCategories, showCategoriesModal])

    useEffect(() => {
        if (!showServicesModal) {
            shouldHydrateServicesModalSelectionRef.current = false
            setSelectedServices(getSelectedCatalogItemIds(allServices))
            return
        }

        if (shouldHydrateServicesModalSelectionRef.current && allServices.length > 0) {
            shouldHydrateServicesModalSelectionRef.current = false
            setSelectedServices(getSelectedCatalogItemIds(allServices))
        }
    }, [allServices, showServicesModal])

    useEffect(() => {
        if (!showCategoriesModal || !categoriesQuery.error) return

        showRetryErrorToast(
            getErrorMessage(categoriesQuery.error, t("business.toast.categoriesLoadFailed")),
            {
                onRetry: () => {
                    void categoriesQuery.refetch()
                },
            }
        )
    }, [categoriesQuery.error, categoriesQuery.refetch, showCategoriesModal, t])

    useEffect(() => {
        if (!showServicesModal || !servicesQuery.error) return

        showRetryErrorToast(
            getErrorMessage(servicesQuery.error, t("business.toast.servicesLoadFailed")),
            {
                onRetry: () => {
                    void servicesQuery.refetch()
                },
            }
        )
    }, [servicesQuery.error, servicesQuery.refetch, showServicesModal, t])

    const selectedCategorySet = useMemo(() => new Set(selectedCategories), [selectedCategories])
    const selectedServiceSet = useMemo(() => new Set(selectedServices), [selectedServices])
    const activeCategories = useMemo(
        () => allCategories.filter((category) => category.isSelected),
        [allCategories]
    )
    const activeServices = useMemo(
        () => allServices.filter((service) => service.isSelected),
        [allServices]
    )

    const {
        saveCategories,
        saveServices,
        toggleEmailIntake,
        isCategoriesMutating,
        isServicesMutating,
        isEmailIntakeMutating,
    } = useBusinessMutationActions({
        organizationId: organizationData.id,
        organizationSlug: organizationData.slug ?? "",
        allCategories,
        selectedCategories,
        setShowCategoriesModal,
        allServices,
        selectedServices,
        setShowServicesModal,
        emailIntakeEnabled,
    })

    const openCategoriesModal = useCallback(() => {
        shouldHydrateCategoriesModalSelectionRef.current = allCategories.length === 0
        setSelectedCategories(getSelectedCatalogItemIds(allCategories))
        setShowCategoriesModal(true)
    }, [allCategories])

    const openServicesModal = useCallback(() => {
        shouldHydrateServicesModalSelectionRef.current = allServices.length === 0
        setSelectedServices(getSelectedCatalogItemIds(allServices))
        setShowServicesModal(true)
    }, [allServices])

    const toggleCategory = useCallback((categoryId: string, checked: boolean) => {
        setSelectedCategories((prev) =>
            checked ? [...prev, categoryId] : prev.filter((id) => id !== categoryId)
        )
    }, [])

    const toggleService = useCallback((serviceId: string, checked: boolean) => {
        setSelectedServices((prev) =>
            checked ? [...prev, serviceId] : prev.filter((id) => id !== serviceId)
        )
    }, [])

    const hasCategoriesChanges = useCallback(() => {
        const initiallySelected = allCategories.filter((cat) => cat.isSelected).map((cat) => cat.id)

        return (
            selectedCategories.length !== initiallySelected.length ||
            !selectedCategories.every((id) => initiallySelected.includes(id))
        )
    }, [allCategories, selectedCategories])

    const isCategoriesSaveDisabled = useCallback(() => {
        return (
            !hasCategoriesChanges() ||
            selectedCategories.length === 0 ||
            isCategoriesMutating ||
            isLoadingCategories
        )
    }, [hasCategoriesChanges, selectedCategories, isCategoriesMutating, isLoadingCategories])

    const hasServicesChanges = useCallback(() => {
        const initiallySelected = allServices
            .filter((service) => service.isSelected)
            .map((service) => service.id)

        return (
            selectedServices.length !== initiallySelected.length ||
            !selectedServices.every((id) => initiallySelected.includes(id))
        )
    }, [allServices, selectedServices])

    const isServicesSaveDisabled = useCallback(() => {
        return (
            !hasServicesChanges() ||
            selectedServices.length === 0 ||
            isServicesMutating ||
            isLoadingServices
        )
    }, [hasServicesChanges, selectedServices, isServicesMutating, isLoadingServices])

    const value = useMemo(
        (): BusinessPageContextValue => ({
            state: {
                organizationData,
                showCategoriesModal,
                showServicesModal,
                showPricingDataDialog,
                allCategories,
                allServices,
                activeCategories,
                activeServices,
                selectedCategorySet,
                selectedServiceSet,
                isLoadingCategories,
                isLoadingServices,
                catalogDataSource,
                emailIntakeEnabled,
                isCategoriesMutating,
                isServicesMutating,
                isEmailIntakeMutating,
            },
            actions: {
                openCategoriesModal,
                openServicesModal,
                setShowCategoriesModal,
                setShowServicesModal,
                setShowPricingDataDialog,
                saveCategories,
                saveServices,
                toggleCategory,
                toggleService,
                toggleEmailIntake,
                hasCategoriesChanges,
                isCategoriesSaveDisabled,
                hasServicesChanges,
                isServicesSaveDisabled,
            },
            meta: {
                organizationId: organizationData.id,
                organizationSlug: organizationData.slug ?? "",
            },
        }),
        [
            organizationData,
            showCategoriesModal,
            showServicesModal,
            showPricingDataDialog,
            allCategories,
            allServices,
            activeCategories,
            activeServices,
            selectedCategorySet,
            selectedServiceSet,
            isLoadingCategories,
            isLoadingServices,
            catalogDataSource,
            emailIntakeEnabled,
            isCategoriesMutating,
            isServicesMutating,
            isEmailIntakeMutating,
            hasCategoriesChanges,
            hasServicesChanges,
            isCategoriesSaveDisabled,
            isServicesSaveDisabled,
            openCategoriesModal,
            openServicesModal,
            saveCategories,
            saveServices,
            toggleCategory,
            toggleEmailIntake,
            toggleService,
        ]
    )

    return <BusinessPageContext value={value}>{children}</BusinessPageContext>
}

function resolveCatalogDataSource(
    categoryDataSource: PrimaryDataSource,
    serviceDataSource: PrimaryDataSource
): PrimaryDataSource {
    if (categoryDataSource === "network" || serviceDataSource === "network") return "network"
    if (categoryDataSource === "prefetch" || serviceDataSource === "prefetch") return "prefetch"
    if (categoryDataSource === "placeholder" || serviceDataSource === "placeholder") {
        return "placeholder"
    }
    if (categoryDataSource === "warm-cache" || serviceDataSource === "warm-cache") {
        return "warm-cache"
    }
    return "unknown"
}
