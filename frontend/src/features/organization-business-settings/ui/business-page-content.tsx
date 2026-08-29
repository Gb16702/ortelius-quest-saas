import { ChevronRight, Database, MailCheck, X } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import {
    CategorySelectionGrid,
    isServiceType,
    ServiceSelectionGroups,
    type ServiceType,
} from "@/entities/service-type"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Button } from "@/shared/ui/button"
import { Dot } from "@/shared/ui/dot"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import { Sheet, SheetContent, SheetScrollArea } from "@/shared/ui/sheet"
import { Skeleton } from "@/shared/ui/skeleton"
import { Stack, StackActionButton, StackItem } from "@/shared/ui/stack"
import { Switch } from "@/shared/ui/switch"

import { useBusinessPage } from "../model/business-page.provider"

const ACTIVE_PREVIEW_LIMIT = 2
interface BusinessSectionProps {
    title: string
    description: string
    children: ReactNode
}

interface ActiveItem {
    id: string
    name: string
}

interface BusinessSettingsRowProps {
    icon?: ReactNode
    title: string
    description: ReactNode
    action?: ReactNode
    onSelect?: () => Promise<void> | void
    onIntent?: () => void
}

interface BusinessCatalogSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    saveLabel: string
    isSaveDisabled: boolean
    onSave: () => void
    children: ReactNode
}

interface PricingDataDialogRenderProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string | null
    onClose: () => void
}

interface BusinessPageContentProps {
    renderPricingDataDialog?: (props: PricingDataDialogRenderProps) => ReactNode
    onPricingDataDialogIntent?: () => void
}

function formatList(items: string[], lang: string) {
    return new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(items)
}

function BusinessSection({ title, description, children }: BusinessSectionProps) {
    return (
        <section className="space-y-6">
            <div className="space-y-2">
                <h2 className="font-medium text-base text-ds-fg leading-none">{title}</h2>
                <p className="text-ds-fg-muted text-sm leading-normal">{description}</p>
            </div>
            {children}
        </section>
    )
}

function BusinessSettingsRow({
    icon,
    title,
    description,
    action,
    onSelect,
    onIntent,
}: BusinessSettingsRowProps) {
    const content = (
        <span className="flex min-w-0 flex-1 items-center gap-4">
            {icon && (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-ds-surface-interactive text-ds-fg-muted [&_svg]:size-4">
                    {icon}
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="block font-medium text-ds-fg text-sm">{title}</span>
                <span className="block max-w-2xl font-[450] text-ds-fg-muted text-xs">
                    {description}
                </span>
            </span>
        </span>
    )

    if (onSelect) {
        return (
            <button
                type="button"
                className="flex w-full cursor-pointer flex-col gap-4 p-4 text-left transition-colors hover:bg-ds-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent-700 focus-visible:ring-inset sm:flex-row sm:items-center"
                onClick={() => {
                    onIntent?.()
                    void onSelect()
                }}
                onFocus={onIntent}
                onPointerDown={onIntent}
                onPointerEnter={onIntent}
            >
                {content}
                <span className="flex shrink-0 items-center self-start text-ds-fg-muted sm:self-center">
                    <ChevronRight className="size-4" />
                </span>
            </button>
        )
    }

    return (
        <StackItem className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {content}
            <StackActionButton className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                {action}
            </StackActionButton>
        </StackItem>
    )
}

function formatActiveItemsText(
    items: ActiveItem[],
    emptyLabel: string,
    lang: string,
    othersLabel: (count: number) => string
) {
    if (items.length === 0) {
        return emptyLabel
    }

    const visibleNames = items.slice(0, ACTIVE_PREVIEW_LIMIT).map((item) => item.name)
    const hiddenCount = items.length - visibleNames.length

    if (hiddenCount === 0) {
        return formatList(visibleNames, lang)
    }

    if (visibleNames.length === 1) {
        return `${visibleNames[0]}, ${othersLabel(hiddenCount)}`
    }

    return `${visibleNames.join(", ")}, ${othersLabel(hiddenCount)}`
}

function getServicesByType(services: Array<ActiveItem & { type?: string }>) {
    const servicesByType: Record<ServiceType, ActiveItem[]> = {
        cargo: [],
        storage: [],
        logistics: [],
        port: [],
    }

    for (const service of services) {
        if (isServiceType(service.type)) {
            servicesByType[service.type].push(service)
        }
    }

    return servicesByType
}

function ActiveItemsDescription({
    items,
    emptyLabel,
    isLoading = false,
}: {
    items: ActiveItem[]
    emptyLabel: string
    isLoading?: boolean
}) {
    const { t, i18n } = useTranslation("settings")
    if (isLoading) {
        return (
            <span className="inline-flex h-4 items-center" aria-hidden="true">
                <Skeleton className="h-2.5 w-32 rounded-xs" />
            </span>
        )
    }

    const hasActiveItems = items.length > 0

    return (
        <span className="inline-flex items-center gap-2">
            <Dot size={"xs"} variant={hasActiveItems ? "success" : "default"} />
            <span>
                {formatActiveItemsText(items, emptyLabel, i18n.language, (count) =>
                    t("business.others", { count })
                )}
            </span>
        </span>
    )
}

function BusinessCatalogSheet({
    open,
    onOpenChange,
    title,
    description,
    saveLabel,
    isSaveDisabled,
    onSave,
    children,
}: BusinessCatalogSheetProps) {
    const { t } = useTranslation("common")
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="!h-[calc(100vh-1.5rem)] bottom-3 m-3 rounded-lg bg-ds-surface p-0 [box-shadow:var(--shadow-bottom-sheet)]"
                onOpenAutoFocus={(event) => event.preventDefault()}
            >
                <div className="flex h-full flex-col">
                    <div className="sticky top-0 z-10 bg-ds-surface px-6 pt-6 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="font-semibold text-ds-fg text-xl">{title}</h2>
                                <p className="text-ds-fg-muted text-sm">{description}</p>
                            </div>
                            <Button
                                variant="outline"
                                radius="full"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="shrink-0"
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    </div>
                    <SheetScrollArea className="px-6 pt-1 pb-6">{children}</SheetScrollArea>
                    <div className="flex shrink-0 items-center justify-end gap-3 bg-gradient-to-b from-transparent via-10% via-ds-surface to-ds-surface px-6 pt-2 pb-4 opacity-100 transition-all delay-150 duration-150 ease-in-out">
                        <Button
                            size="lg"
                            type="button"
                            radius="full"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t("action.cancel")}
                        </Button>
                        <Button
                            variant="solid"
                            size="lg"
                            type="button"
                            radius="full"
                            disabled={isSaveDisabled}
                            onClick={onSave}
                        >
                            {saveLabel}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

export function BusinessPageContent({
    renderPricingDataDialog,
    onPricingDataDialogIntent,
}: BusinessPageContentProps) {
    const { t } = useTranslation("settings")
    const { state, actions } = useBusinessPage()
    const { state: orgState, meta } = useOrg()
    const inboundAddress = state.organizationData.slug
        ? `${state.organizationData.slug}@inbound.ortelius.app`
        : t("business.intelligence.emailIntake.fallbackAddress")
    const servicesByType = getServicesByType(state.allServices)
    const isCatalogReady = !state.isLoadingCategories && !state.isLoadingServices

    usePrimaryDataVisibleMetric({
        routeId: "org.settings.business",
        isVisible: isCatalogReady && Boolean(state.organizationData.id),
        dataSource: state.catalogDataSource,
        itemCount: state.allCategories.length + state.allServices.length,
        detail: { source: "client-query" },
    })

    return (
        <div className="flex w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(orgState.org, [
                    { label: t("nav.settings"), href: `/org/${meta.slug}/settings` },
                    { label: t("nav.business") },
                ])}
            />
            <ProfilePageHead title={t("business.title")} maxWidth="4xl" />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="flex w-full max-w-4xl flex-col py-6">
                    <div className="space-y-12">
                        <BusinessSection
                            title={t("business.catalog.heading")}
                            description={t("business.catalog.description")}
                        >
                            <Stack>
                                <BusinessSettingsRow
                                    title={t("business.catalog.cargoTypes.title")}
                                    description={
                                        <ActiveItemsDescription
                                            items={state.activeCategories}
                                            emptyLabel={t("business.catalog.cargoTypes.empty")}
                                            isLoading={state.isLoadingCategories}
                                        />
                                    }
                                    onSelect={actions.openCategoriesModal}
                                />

                                <BusinessSettingsRow
                                    title={t("business.catalog.services.title")}
                                    description={
                                        <ActiveItemsDescription
                                            items={state.activeServices}
                                            emptyLabel={t("business.catalog.services.empty")}
                                            isLoading={state.isLoadingServices}
                                        />
                                    }
                                    onSelect={actions.openServicesModal}
                                />
                            </Stack>
                        </BusinessSection>

                        <BusinessSection
                            title={t("business.intelligence.heading")}
                            description={t("business.intelligence.description")}
                        >
                            <Stack>
                                <BusinessSettingsRow
                                    icon={<Database />}
                                    title={t("business.intelligence.pricingData.title")}
                                    description={t("business.intelligence.pricingData.description")}
                                    onIntent={onPricingDataDialogIntent}
                                    onSelect={() => {
                                        onPricingDataDialogIntent?.()
                                        actions.setShowPricingDataDialog(true)
                                    }}
                                />

                                <BusinessSettingsRow
                                    icon={<MailCheck />}
                                    title={t("business.intelligence.emailIntake.title")}
                                    description={
                                        <>
                                            {t(
                                                "business.intelligence.emailIntake.descriptionPrefix"
                                            )}
                                            <span className="text-ds-fg">{inboundAddress}</span>
                                            {t(
                                                "business.intelligence.emailIntake.descriptionSuffix"
                                            )}
                                        </>
                                    }
                                    action={
                                        <Switch
                                            size="default"
                                            checked={state.emailIntakeEnabled}
                                            onCheckedChange={actions.toggleEmailIntake}
                                        />
                                    }
                                />
                            </Stack>
                        </BusinessSection>

                        <BusinessCatalogSheet
                            open={state.showCategoriesModal}
                            onOpenChange={actions.setShowCategoriesModal}
                            title={t("business.cargoSheet.title")}
                            description={t("business.cargoSheet.description")}
                            saveLabel={t("business.cargoSheet.saveLabel")}
                            isSaveDisabled={actions.isCategoriesSaveDisabled()}
                            onSave={actions.saveCategories}
                        >
                            <CategorySelectionGrid
                                categories={state.allCategories}
                                selectedCategoryIds={state.selectedCategorySet}
                                isLoading={state.isLoadingCategories}
                                onCategoryChange={actions.toggleCategory}
                            />
                        </BusinessCatalogSheet>

                        <BusinessCatalogSheet
                            open={state.showServicesModal}
                            onOpenChange={actions.setShowServicesModal}
                            title={t("business.servicesSheet.title")}
                            description={t("business.servicesSheet.description")}
                            saveLabel={t("business.servicesSheet.saveLabel")}
                            isSaveDisabled={actions.isServicesSaveDisabled()}
                            onSave={actions.saveServices}
                        >
                            <ServiceSelectionGroups
                                servicesByType={servicesByType}
                                selectedServiceIds={state.selectedServiceSet}
                                isLoading={state.isLoadingServices}
                                onServiceChange={actions.toggleService}
                            />
                        </BusinessCatalogSheet>

                        {renderPricingDataDialog?.({
                            open: state.showPricingDataDialog,
                            onOpenChange: actions.setShowPricingDataDialog,
                            organizationId: state.organizationData?.id ?? null,
                            onClose: () => actions.setShowPricingDataDialog(false),
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
