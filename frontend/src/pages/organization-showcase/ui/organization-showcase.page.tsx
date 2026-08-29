import { X } from "lucide-react"
import { Suspense, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
    applyOrganizationFontToDocument,
    createOrganizationBrandColorStyle,
    createOrganizationFontStyle,
    type OrganizationShowcaseData,
} from "@/entities/organization"
import { useSendRequestSheet } from "@/features/requests"
import { type SupportedLanguage, syncMarketingLanguage } from "@/shared/lib/i18n/marketing"
import { preloadableLazy } from "@/shared/lib/performance/preloadable-lazy"
import { useIdlePreload } from "@/shared/lib/performance/use-idle-preload"
import { Button } from "@/shared/ui/button"
import { Sheet, SheetContent } from "@/shared/ui/sheet"
import { Skeleton } from "@/shared/ui/skeleton"
import { OrganizationShowcaseCargoTypes } from "./showcase/organization-showcase-cargo-types"
import { OrganizationShowcaseDetails } from "./showcase/organization-showcase-details"
import { OrganizationShowcaseHeader } from "./showcase/organization-showcase-header"
import {
    OrganizationShowcaseOverview,
    OrganizationShowcaseOverviewEmpty,
} from "./showcase/organization-showcase-overview"
import { OrganizationShowcaseServices } from "./showcase/organization-showcase-services"

const SendRequestForm = preloadableLazy(() =>
    import("@/features/requests").then((module) => ({
        default: module.SendRequestForm,
    }))
)

interface OrganizationShowcasePageProps {
    showcaseData: OrganizationShowcaseData
    isUserMember: boolean
    isAdmin: boolean
    slug: string
    loginUrl: string
    lang: SupportedLanguage
}

export function OrganizationShowcasePage({
    showcaseData,
    isUserMember,
    isAdmin,
    slug,
    loginUrl,
    lang,
}: OrganizationShowcasePageProps) {
    const sendRequestSheet = useSendRequestSheet()
    const organizationStyles = {
        ...createOrganizationBrandColorStyle(showcaseData.organization.brandColor),
        ...createOrganizationFontStyle(showcaseData.organization.font),
    }
    const organizationFont = showcaseData.organization.font
    const sendRequestPreload = useIdlePreload(SendRequestForm.preload, {
        enabled: !isUserMember,
    })

    syncMarketingLanguage(lang)

    useEffect(() => applyOrganizationFontToDocument(organizationFont), [organizationFont])
    useEffect(() => {
        syncMarketingLanguage(lang)
    }, [lang])

    const openSendRequestSheet = () => {
        void sendRequestPreload.preload()
        sendRequestSheet.open()
    }

    return (
        <div className="min-h-dvh bg-ds-canvas py-6" style={organizationStyles}>
            <OrganizationShowcaseHeader
                organization={showcaseData.organization}
                showCTA={!isUserMember}
                isMember={isUserMember}
                isAdmin={isAdmin}
                onSendRequest={openSendRequestSheet}
                onSendRequestIntent={() => void sendRequestPreload.preload()}
            />
            <div className="mx-auto max-w-[theme(width.3xl)]">
                <div className="flex flex-col gap-12 py-20 lg:flex-row">
                    <main className="min-w-0 flex-1 space-y-12">
                        {showcaseData.organization.overview ? (
                            <OrganizationShowcaseOverview
                                overview={showcaseData.organization.overview}
                            />
                        ) : isAdmin ? (
                            <OrganizationShowcaseOverviewEmpty slug={slug} />
                        ) : null}
                        <OrganizationShowcaseServices services={showcaseData.services} />
                        <OrganizationShowcaseCargoTypes cargoTypes={showcaseData.cargoTypes} />
                    </main>
                    <div className="w-full shrink-0 lg:w-[320px]">
                        <OrganizationShowcaseDetails
                            organization={showcaseData.organization}
                            lang={lang}
                        />
                    </div>
                </div>
            </div>
            <Sheet
                open={sendRequestSheet.isOpen}
                onOpenChange={(open) => {
                    if (!open) sendRequestSheet.close()
                }}
            >
                <SheetContent
                    className="!h-[calc(100vh-1.5rem)] bottom-3 m-3 rounded-lg bg-ds-surface p-0 [box-shadow:var(--shadow-bottom-sheet)]"
                    style={organizationStyles}
                >
                    {sendRequestSheet.isOpen && (
                        <Suspense
                            fallback={<SendRequestFormSkeleton onClose={sendRequestSheet.close} />}
                        >
                            <SendRequestForm
                                subdomain={slug}
                                receiverOrganizationId={showcaseData.organization.id}
                                initialStep={1}
                                loginUrl={loginUrl}
                                onClose={sendRequestSheet.close}
                                onSuccess={() => sendRequestSheet.close()}
                            />
                        </Suspense>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}

interface SendRequestFormSkeletonProps {
    onClose: () => void
}

function SendRequestFormSkeleton({ onClose }: SendRequestFormSkeletonProps) {
    const { t } = useTranslation("organization-showcase")
    const steps = [
        t("sheet.steps.contactInformation"),
        t("sheet.steps.cargoType"),
        t("sheet.steps.services"),
        t("sheet.steps.details"),
    ]

    return (
        <div aria-busy="true" aria-live="polite" className="h-full overflow-y-auto bg-ds-surface">
            <div className="sticky top-0 z-10 bg-ds-surface px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="font-semibold text-ds-fg text-xl">{t("sheet.title")}</h2>
                        <p className="text-ds-fg-muted text-sm">{t("sheet.subtitle")}</p>
                    </div>
                    <Button
                        aria-label={t("sheet.close")}
                        variant="outline"
                        radius="full"
                        size="icon"
                        onClick={onClose}
                        className="shrink-0"
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col px-6 pb-6">
                {steps.map((label, index) => {
                    const isCurrent = index === 0
                    const isLast = index === steps.length - 1

                    return (
                        <div key={label}>
                            <div className="rounded-md border border-ds-surface-border">
                                <div className="flex items-center gap-3 p-4">
                                    <Skeleton className="size-7 rounded-full" />
                                    <span className="font-medium">{label}</span>
                                </div>

                                {isCurrent ? (
                                    <>
                                        <div className="flex w-full flex-col gap-y-5 p-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-20" />
                                                    <Skeleton className="h-9 w-full rounded-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-20" />
                                                    <Skeleton className="h-9 w-full rounded-sm" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-12" />
                                                <Skeleton className="h-9 w-full rounded-sm" />
                                                <Skeleton className="h-4 w-64 max-w-full" />
                                            </div>
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-9 w-full rounded-sm" />
                                                <Skeleton className="h-4 w-60 max-w-full" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end px-4 py-3">
                                            <Skeleton className="h-9 w-28 rounded-full" />
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            {!isLast && (
                                <div className="flex justify-start pl-7">
                                    <div className="h-6 border-ds-control-border border-l border-dashed" />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
