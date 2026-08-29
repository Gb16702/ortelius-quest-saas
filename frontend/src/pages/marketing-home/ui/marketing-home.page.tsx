import { Link } from "@tanstack/react-router"
import { Image } from "@unpic/react"
import { useTranslation } from "react-i18next"
import { getMarketingCta } from "@/shared/lib/marketing/marketing-cta"
import { MarketingCtaLink } from "@/shared/lib/marketing/marketing-cta-link"
import { Button } from "@/shared/ui/button"
import { Dot } from "@/shared/ui/dot"
import { ArrowChevron } from "@/shared/ui/icons/arrow-chevron"
import { LazyVideo } from "@/shared/ui/lazy-video"
import { MobileVideo } from "@/shared/ui/mobile-video"
import { useMarketingSession } from "@/widgets/marketing-layout"
import { CtaSection, FaqSection } from "@/widgets/marketing-sections"
import { HowItWorksCard } from "./sections/how-it-works-card"
import { CentralizeIllustration } from "./sections/illustrations/centralize-illustration"
import { RespondIllustration } from "./sections/illustrations/respond-illustration"
import { RouteIllustration } from "./sections/illustrations/route-illustration"
import { MacToolbar } from "./sections/mac-toolbar"

export function MarketingHomePage() {
    const { t } = useTranslation()
    const { lang, session, activeOrgSlug } = useMarketingSession()
    const cta = getMarketingCta({
        lang,
        isAuthenticated: !!session?.user,
        activeOrgSlug,
    })

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-ds-surface pt-24 lg:pt-36">
            <div className="container relative z-10 mx-auto w-full px-8 py-12 text-center sm:py-0 lg:px-0">
                <h1 className="font-bold text-4xl leading-[1.12] lg:text-5xl xl:text-6xl">
                    <span className="text-ds-fg">{t("home.hero.title")}</span>
                </h1>
                <div className="flex w-full justify-center">
                    <p className="mt-4 w-full max-w-lg font-medium text-ds-fg text-lg leading-relaxed sm:mt-6 lg:text-xl">
                        {t("home.hero.subtitle")}
                    </p>
                </div>

                <div className="relative mt-8 flex flex-col-reverse items-center justify-center gap-4 md:flex-row">
                    <div className="absolute left-1/2 -z-10 hidden h-px w-screen -translate-x-1/2 bg-ds-surface-border md:block" />
                    <Button
                        radius={"full"}
                        size="xl"
                        asChild
                        className="group relative z-10 flex min-w-full justify-center border border-ds-surface-border bg-ds-surface text-ds-fg outline-none hover:bg-ds-surface md:min-w-[140px] md:justify-between md:border-none md:shadow-dropdown"
                    >
                        <Link
                            to="/$lang/contact"
                            params={{ lang }}
                            search={{ demo: true }}
                            className="flex items-center justify-between gap-2"
                        >
                            <Dot
                                size="sm"
                                radius="full"
                                className="hidden bg-ds-gray-400 group-hover:bg-ds-blue-700 md:block"
                            />
                            {t("home.hero.bookDemo")}
                        </Link>
                    </Button>
                    <div className="flex w-full justify-between md:w-auto">
                        <Button
                            radius={"full"}
                            variant="brand"
                            size="xl"
                            className="group relative z-10 flex w-full items-center justify-center gap-0.5 md:w-auto md:min-w-[140px] md:justify-between"
                            asChild
                        >
                            <MarketingCtaLink cta={cta}>
                                {t(cta.labelKey, { defaultValue: cta.fallback })}
                                <ArrowChevron className="hidden md:block" />
                            </MarketingCtaLink>
                        </Button>
                    </div>
                </div>

                <div className="container relative mx-auto mt-8 mb-12 hidden max-w-fit rounded-lg shadow-modal sm:mb-16 sm:block lg:mb-20">
                    <div className="relative overflow-hidden rounded-lg bg-ds-surface">
                        <div className="rounded-md p-2">
                            <Image
                                src="/assets/hero.png"
                                alt={t("home.hero.heroImageAlt")}
                                layout="constrained"
                                width={1200}
                                height={700}
                                className="h-auto rounded-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative w-full bg-ds-surface px-8 py-12 sm:px-0 sm:py-16">
                <div className="container relative z-10 mx-auto w-full px-0 text-start">
                    <h2 className="max-w-sm text-left font-bold text-3xl text-ds-fg leading-tight sm:max-w-full sm:text-center lg:text-4xl">
                        {t("home.howItWorks.title")}
                    </h2>

                    <div className="mx-auto mt-9 grid w-full grid-cols-1 gap-6 sm:mt-14 md:grid-cols-3">
                        <HowItWorksCard
                            number={t("home.howItWorks.step1.number")}
                            title={t("home.howItWorks.step1.title")}
                            description={t("home.howItWorks.step1.description")}
                            illustration={<CentralizeIllustration />}
                        />
                        <HowItWorksCard
                            number={t("home.howItWorks.step2.number")}
                            title={t("home.howItWorks.step2.title")}
                            description={t("home.howItWorks.step2.description")}
                            illustration={<RouteIllustration />}
                        />
                        <HowItWorksCard
                            number={t("home.howItWorks.step3.number")}
                            title={t("home.howItWorks.step3.title")}
                            description={t("home.howItWorks.step3.description")}
                            illustration={<RespondIllustration />}
                        />
                    </div>
                </div>
            </div>

            <div className="relative w-full bg-ds-surface px-8 py-12 sm:bg-gradient-to-b sm:from-0% sm:from-ds-surface sm:to-[30%] sm:to-ds-canvas sm:px-0 sm:py-32">
                <div className="container mx-auto w-full px-0">
                    <div className="relative z-10 mx-auto w-full">
                        <div className="w-full space-y-20 sm:space-y-28">
                            {/* Feature 1: Built for Business */}
                            <div className="grid grid-cols-1 items-center gap-8 sm:gap-16 lg:grid-cols-[400px_1fr]">
                                <div className="flex flex-col gap-8">
                                    <div>
                                        <span className="mb-3 inline-flex items-center gap-1.5 font-medium text-ds-blue-700 text-sm">
                                            {t("home.features.builtForBusiness.label")}
                                        </span>
                                        <h3 className="mb-4 max-w-xs font-bold text-3xl text-ds-fg">
                                            {t("home.features.builtForBusiness.title")}
                                        </h3>
                                        <p className="max-w-sm text-base text-ds-fg leading-relaxed">
                                            {t("home.features.builtForBusiness.description")}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-8 sm:gap-6">
                                        <div>
                                            <h4 className="mb-1 font-semibold text-base text-ds-fg">
                                                {t("home.features.builtForBusiness.portal.title")}
                                            </h4>
                                            <p className="text-base text-ds-fg-muted leading-relaxed">
                                                {t(
                                                    "home.features.builtForBusiness.portal.description"
                                                )}
                                            </p>
                                        </div>

                                        <div>
                                            <h4 className="mb-1 font-semibold text-base text-ds-fg">
                                                {t("home.features.builtForBusiness.setup.title")}
                                            </h4>
                                            <p className="text-base text-ds-fg-muted leading-relaxed">
                                                {t(
                                                    "home.features.builtForBusiness.setup.description"
                                                )}
                                            </p>
                                        </div>

                                        <MarketingCtaLink
                                            cta={cta}
                                            className="group hidden w-fit items-center gap-1.5 font-medium text-xs transition-colors sm:inline-flex"
                                        >
                                            {t(cta.labelKey, { defaultValue: cta.fallback })}
                                            <ArrowChevron className="!stroke-1 size-3" />
                                        </MarketingCtaLink>
                                    </div>
                                </div>

                                <div className="lg:hidden">
                                    <MobileVideo src="/assets/videos/business_configuration.mp4" />
                                </div>
                                <div className="relative hidden lg:block">
                                    <div className="pointer-events-none absolute -inset-x-14 -bottom-8 z-10 h-96 bg-gradient-to-t from-[1%] from-ds-canvas" />
                                    <div className="absolute -inset-x-14 top-full z-10 mt-8 h-16 bg-ds-canvas" />
                                    <MacToolbar>
                                        <LazyVideo src="/assets/videos/business_configuration.mp4" />
                                    </MacToolbar>
                                </div>
                            </div>

                            {/* Feature 2: Respond Instantly */}
                            <div className="grid grid-cols-1 items-center gap-8 sm:gap-16 lg:grid-cols-[1fr_400px]">
                                <div className="order-2 lg:hidden">
                                    <MobileVideo src="/assets/videos/call.mp4" />
                                </div>
                                <div className="relative order-2 hidden lg:order-1 lg:block">
                                    <div className="pointer-events-none absolute -inset-x-14 -bottom-8 z-10 h-96 bg-gradient-to-t from-[1%] from-ds-canvas" />
                                    <div className="absolute -inset-x-14 top-full z-10 mt-8 h-16 bg-ds-canvas" />
                                    <MacToolbar>
                                        <LazyVideo src="/assets/videos/call.mp4" />
                                    </MacToolbar>
                                </div>

                                <div className="order-1 flex flex-col gap-8 lg:order-2">
                                    <div>
                                        <span className="mb-3 inline-flex items-center gap-1.5 font-medium text-ds-blue-700 text-sm">
                                            {t("home.features.respondInstantly.label")}
                                        </span>
                                        <h3 className="mb-4 max-w-xs font-bold text-3xl text-ds-fg">
                                            {t("home.features.respondInstantly.title")}
                                        </h3>
                                        <p className="text-base text-ds-fg leading-relaxed">
                                            {t("home.features.respondInstantly.description")}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        <div>
                                            <h4 className="mb-1 font-semibold text-base text-ds-fg">
                                                {t("home.features.respondInstantly.chat.title")}
                                            </h4>
                                            <p className="text-base text-ds-fg-muted leading-relaxed">
                                                {t(
                                                    "home.features.respondInstantly.chat.description"
                                                )}
                                            </p>
                                        </div>

                                        <div>
                                            <h4 className="mb-1 font-semibold text-base text-ds-fg">
                                                {t("home.features.respondInstantly.calling.title")}
                                            </h4>
                                            <p className="text-base text-ds-fg-muted leading-relaxed">
                                                {t(
                                                    "home.features.respondInstantly.calling.description"
                                                )}
                                            </p>
                                        </div>

                                        <MarketingCtaLink
                                            cta={cta}
                                            className="group hidden w-fit items-center gap-1.5 font-medium text-xs transition-colors sm:inline-flex"
                                        >
                                            {t(cta.labelKey, { defaultValue: cta.fallback })}
                                            <ArrowChevron className="!stroke-1 size-3" />
                                        </MarketingCtaLink>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 3: Track Everything */}
                            <div className="grid grid-cols-1 items-center gap-8 sm:gap-16 lg:grid-cols-[400px_1fr]">
                                <div className="flex flex-col gap-8">
                                    <div>
                                        <span className="mb-3 inline-flex items-center gap-1.5 font-medium text-ds-blue-700 text-sm">
                                            {t("home.features.trackEverything.label")}
                                        </span>
                                        <h3 className="mb-4 max-w-xs font-bold text-3xl text-ds-fg">
                                            {t("home.features.trackEverything.title")}
                                        </h3>
                                        <p className="text-base text-ds-fg leading-relaxed">
                                            {t("home.features.trackEverything.description")}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        <div>
                                            <h4 className="mb-1 font-semibold text-base text-ds-fg">
                                                {t("home.features.trackEverything.pipeline.title")}
                                            </h4>
                                            <p className="text-base text-ds-fg-muted leading-relaxed">
                                                {t(
                                                    "home.features.trackEverything.pipeline.description"
                                                )}
                                            </p>
                                        </div>

                                        <div>
                                            <h4 className="mb-1 font-semibold text-base text-ds-fg">
                                                {t("home.features.trackEverything.filters.title")}
                                            </h4>
                                            <p className="text-base text-ds-fg-muted leading-relaxed">
                                                {t(
                                                    "home.features.trackEverything.filters.description"
                                                )}
                                            </p>
                                        </div>

                                        <MarketingCtaLink
                                            cta={cta}
                                            className="group hidden w-fit items-center gap-1.5 font-medium text-xs transition-colors sm:inline-flex"
                                        >
                                            {t(cta.labelKey, { defaultValue: cta.fallback })}
                                            <ArrowChevron className="!stroke-1 size-3" />
                                        </MarketingCtaLink>
                                    </div>
                                </div>

                                <div className="lg:hidden">
                                    <MobileVideo src="/assets/videos/requests.mp4" />
                                </div>

                                <div className="relative hidden lg:block">
                                    <div className="pointer-events-none absolute -inset-x-14 -bottom-8 z-10 h-96 bg-gradient-to-t from-[1%] from-ds-canvas" />
                                    <div className="absolute -inset-x-14 top-full z-10 mt-8 h-16 bg-ds-canvas" />
                                    <MacToolbar>
                                        <LazyVideo src="/assets/videos/requests.mp4" />
                                    </MacToolbar>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {!activeOrgSlug && (
                <div className="hidden w-full sm:block">
                    <CtaSection lang={lang} />
                </div>
            )}
            <FaqSection />
        </div>
    )
}
