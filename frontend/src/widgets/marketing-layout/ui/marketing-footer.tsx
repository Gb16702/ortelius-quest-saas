import { Link } from "@tanstack/react-router"
import { Image } from "@unpic/react"
import { useTranslation } from "react-i18next"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing"
import { LanguageSwitcher } from "./language-switcher"

interface MarketingFooterProps {
    lang: SupportedLanguage
}

export function MarketingFooter({ lang }: MarketingFooterProps) {
    const { t } = useTranslation()
    const currentYear = new Date().getFullYear()
    const currentLang = lang

    return (
        <footer className="footer-bg">
            <div className="container mx-auto px-8 py-12 md:py-16 lg:px-0 lg:py-20">
                <div className="flex flex-col justify-between gap-10 lg:flex-row lg:gap-12">
                    <div className="flex flex-col gap-6 leading-relaxed lg:gap-0">
                        <div className="hidden md:block">
                            <h3 className="font-medium text-2xl text-ds-fg leading-[1.7]">
                                {t("footer.tagline1")}
                            </h3>
                            <h3 className="font-medium text-2xl text-ds-fg-muted">
                                {t("footer.tagline2")}
                            </h3>
                        </div>
                        <Link
                            to="/$lang/home"
                            params={{ lang: currentLang }}
                            className="flex items-center gap-3 lg:mt-auto"
                        >
                            <Image
                                src="/assets/logo-alt.png"
                                alt={t("home.hero.heroImageAlt")}
                                layout="constrained"
                                width={108}
                                height={108}
                                className="h-auto w-24 rounded-sm md:w-[108px]"
                            />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-10 md:grid-cols-3 md:gap-12 lg:gap-20">
                        <div>
                            <h4 className="mb-4 font-semibold text-ds-fg text-sm sm:mb-2.5">
                                {t("footer.company")}
                            </h4>
                            <ul className="space-y-2.5 text-sm [&_a:hover]:text-ds-fg [&_a]:text-ds-fg-subtle [&_a]:transition-colors [&_a]:duration-300">
                                <li>
                                    <Link to="/$lang/home" params={{ lang: currentLang }}>
                                        {t("nav.home")}
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/$lang/pricing" params={{ lang: currentLang }}>
                                        {t("nav.pricing")}
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/$lang/contact" params={{ lang: currentLang }}>
                                        {t("nav.contact")}
                                    </Link>
                                </li>
                                <li>
                                    <a
                                        href="https://ortelius.app"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {t("footer.discoverMarketplace")}
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="mb-4 font-semibold text-ds-fg text-sm sm:mb-2.5">
                                {t("footer.legal")}
                            </h4>
                            <ul className="space-y-2.5 text-sm [&_a:hover]:text-ds-fg [&_a]:text-ds-fg-subtle [&_a]:transition-colors [&_a]:duration-300">
                                <li>
                                    <Link to="/terms">{t("footer.termsOfService")}</Link>
                                </li>
                                <li>
                                    <Link to="/privacy">{t("footer.privacyPolicy")}</Link>
                                </li>
                                <li>
                                    <Link to="/cookies">{t("footer.cookiePolicy")}</Link>
                                </li>
                            </ul>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <h4 className="mb-4 font-semibold text-ds-fg text-sm sm:mb-2.5">
                                {t("footer.socials")}
                            </h4>
                            <ul className="space-y-3 text-xs [&_a:hover]:text-ds-fg [&_a]:text-ds-fg-subtle [&_a]:transition-colors [&_a]:duration-300">
                                <li>
                                    <a
                                        href="https://www.linkedin.com/company/ortelius-app"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                        </svg>
                                        LinkedIn
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-ds-surface-border border-t pt-6 text-ds-fg-subtle text-xs md:mt-12 md:pt-8">
                    <p>{t("footer.copyright", { year: currentYear })}</p>
                    <LanguageSwitcher lang={currentLang} />
                </div>
            </div>
        </footer>
    )
}
