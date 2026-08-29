import { Link } from "@tanstack/react-router"
import { Image } from "@unpic/react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { clearClientLoggedInHint, clearClientLogoutStorage } from "@/shared/lib/auth/client-logout"
import { cn } from "@/shared/lib/class-names"
import { useScrolled } from "@/shared/lib/dom/use-scrolled"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing-languages"
import { getMarketingCta } from "@/shared/lib/marketing/marketing-cta"
import { MarketingCtaLink } from "@/shared/lib/marketing/marketing-cta-link"
import { Button } from "@/shared/ui/button"
import type { LegalHeaderSession } from "../model/legal-header-session"

interface LegalPublicHeaderProps {
    navLang: SupportedLanguage
    session: LegalHeaderSession | null
    activeOrgSlug: string | null
    headerBg: string
}

const LEGAL_HEADER_NAV_ITEMS = [
    { labelKey: "nav.home", to: "/$lang/home", animationClass: "animate-menu-item-1" },
    { labelKey: "nav.pricing", to: "/$lang/pricing", animationClass: undefined },
    { labelKey: "nav.contact", to: "/$lang/contact", animationClass: "animate-menu-item-3" },
] as const

export function LegalPublicHeader({
    navLang,
    session,
    activeOrgSlug,
    headerBg,
}: LegalPublicHeaderProps) {
    const { t } = useTranslation()
    const isScrolled = useScrolled({ threshold: 30 })
    const headerRef = useRef<HTMLElement>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const confirmedAuthState = session?.user ? "logged-in" : "anonymous"
    const loggedOutCta = getMarketingCta({
        lang: navLang,
        isAuthenticated: false,
        activeOrgSlug: null,
    })
    const loggedInCta = getMarketingCta({
        lang: navLang,
        isAuthenticated: true,
        activeOrgSlug,
    })

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => {
            document.body.style.overflow = ""
        }
    }, [isMenuOpen])

    const closeMenu = () => setIsMenuOpen(false)
    const signOut = () => {
        clearClientLogoutStorage()
        clearClientLoggedInHint()
        closeMenu()
    }

    return (
        <header
            ref={headerRef}
            className="fixed top-0 z-[100000] w-full transition-all"
            data-auth-state={confirmedAuthState}
        >
            <div
                className={cn(
                    "absolute inset-0",
                    headerBg,
                    isScrolled && !isMenuOpen && "border-ds-surface-border border-b"
                )}
            />
            <div className="container relative mx-auto px-8 lg:hidden">
                <div className="flex h-16 items-center justify-between md:h-14">
                    <Link
                        to="/$lang/home"
                        params={{ lang: navLang }}
                        className="flex items-center"
                        onClick={closeMenu}
                    >
                        <Image
                            src="/assets/logo.svg"
                            alt={t("home.hero.heroImageAlt")}
                            layout="constrained"
                            width={32}
                            height={32}
                            className="h-auto rounded-sm"
                        />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Button
                            radius="full"
                            variant="brand"
                            size="sm"
                            className="h-9 px-4 font-medium font-sans text-[14px]"
                            data-hide="logged-in"
                            asChild
                        >
                            <MarketingCtaLink cta={loggedOutCta} onClick={closeMenu}>
                                {t(loggedOutCta.labelKey, { defaultValue: loggedOutCta.fallback })}
                            </MarketingCtaLink>
                        </Button>
                        <Button
                            radius="full"
                            variant="brand"
                            size="sm"
                            className="h-9 px-4 font-medium font-sans text-[14px]"
                            data-show="logged-in"
                            asChild
                        >
                            <MarketingCtaLink cta={loggedInCta} onClick={closeMenu}>
                                {t(loggedInCta.labelKey, { defaultValue: loggedInCta.fallback })}
                            </MarketingCtaLink>
                        </Button>
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-ds-surface-border bg-ds-surface"
                            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                        >
                            <div className="relative flex h-6 items-center justify-center">
                                <span
                                    className={cn(
                                        "absolute h-[2px] w-[14px] rounded-full bg-ds-fg transition-transform duration-200",
                                        isMenuOpen ? "rotate-45" : "-translate-y-[3.5px]"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "absolute h-[2px] w-[14px] rounded-full bg-ds-fg transition-transform duration-200",
                                        isMenuOpen ? "-rotate-45" : "translate-y-[3.5px]"
                                    )}
                                />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={cn(
                    "fixed inset-0 top-16 bg-ds-surface md:top-14 lg:hidden",
                    isMenuOpen ? "pointer-events-auto" : "pointer-events-none invisible"
                )}
            >
                <div className="flex h-full flex-col">
                    <nav className="flex-1 px-8 py-4">
                        <ul className="space-y-0.5">
                            {LEGAL_HEADER_NAV_ITEMS.map((item) => (
                                <li key={item.labelKey}>
                                    <Link
                                        to={item.to}
                                        params={{ lang: navLang }}
                                        onClick={closeMenu}
                                        className={cn(
                                            "block py-3 font-semibold text-ds-fg text-xl",
                                            isMenuOpen && item.animationClass
                                        )}
                                    >
                                        {t(item.labelKey)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className={cn("space-y-3 border-ds-surface-border border-t p-8")}>
                        <Button
                            radius="full"
                            variant="ghost"
                            size="xl"
                            className="w-full font-medium font-sans"
                            data-hide="logged-in"
                            asChild
                        >
                            <Link to="/sign-in" onClick={closeMenu}>
                                {t("nav.signIn", { defaultValue: "Sign in" })}
                            </Link>
                        </Button>
                        <Button
                            radius="full"
                            variant="brand"
                            size="xl"
                            className="w-full font-medium font-sans"
                            data-hide="logged-in"
                            asChild
                        >
                            <MarketingCtaLink cta={loggedOutCta} onClick={closeMenu}>
                                {t(loggedOutCta.labelKey, { defaultValue: loggedOutCta.fallback })}
                            </MarketingCtaLink>
                        </Button>
                        <Button
                            radius="full"
                            variant="brand"
                            size="xl"
                            className="w-full font-medium font-sans"
                            data-show="logged-in"
                            asChild
                        >
                            <MarketingCtaLink cta={loggedInCta} onClick={closeMenu}>
                                {t(loggedInCta.labelKey, { defaultValue: loggedInCta.fallback })}
                            </MarketingCtaLink>
                        </Button>
                        <Button
                            radius="full"
                            variant="outline"
                            size="xl"
                            className="w-full font-medium font-sans"
                            data-show="logged-in"
                            asChild
                        >
                            <a href="/auth/logout" onClick={signOut}>
                                {t("nav.signOut", { defaultValue: "Sign out" })}
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
            <div className="container relative mx-auto hidden p-0 lg:block">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex flex-1 items-center">
                        <Link
                            to="/$lang/home"
                            params={{ lang: navLang }}
                            className="flex items-center"
                        >
                            <Image
                                src="/assets/logo-alt.png"
                                alt={t("home.hero.heroImageAlt")}
                                layout="constrained"
                                width={102}
                                height={102}
                                className="h-auto rounded-sm"
                            />
                        </Link>
                    </div>
                    <div className="flex items-center justify-center gap-x-1">
                        {LEGAL_HEADER_NAV_ITEMS.map((item) => (
                            <Button
                                key={item.labelKey}
                                radius="full"
                                variant="ghost"
                                size="sm"
                                className="min-w-24"
                                asChild
                            >
                                <Link to={item.to} params={{ lang: navLang }}>
                                    {t(item.labelKey)}
                                </Link>
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-1">
                        <Button
                            radius="full"
                            variant="ghost"
                            size="sm"
                            className="font-medium font-sans"
                            data-show="logged-in"
                            asChild
                        >
                            <a href="/auth/logout" onClick={signOut}>
                                {t("nav.signOut", { defaultValue: "Sign out" })}
                            </a>
                        </Button>
                        <Button
                            radius="full"
                            variant="ghost"
                            size="sm"
                            className="font-medium font-sans"
                            data-hide="logged-in"
                            asChild
                        >
                            <Link to="/sign-in">
                                {t("nav.signIn", { defaultValue: "Sign in" })}
                            </Link>
                        </Button>
                        <Button
                            radius="full"
                            variant="brand"
                            size="sm"
                            className="ml-2 font-medium font-sans"
                            data-hide="logged-in"
                            asChild
                        >
                            <MarketingCtaLink cta={loggedOutCta}>
                                {t(loggedOutCta.labelKey, {
                                    defaultValue: loggedOutCta.fallback,
                                })}
                            </MarketingCtaLink>
                        </Button>
                        <Button
                            radius="full"
                            variant="brand"
                            size="sm"
                            className="ml-2 font-medium font-sans"
                            data-show="logged-in"
                            asChild
                        >
                            <MarketingCtaLink cta={loggedInCta}>
                                {t(loggedInCta.labelKey, { defaultValue: loggedInCta.fallback })}
                            </MarketingCtaLink>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    )
}
