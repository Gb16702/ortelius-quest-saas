import { Link } from "@tanstack/react-router"
import { Share2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { OrganizationShowcaseOrganization } from "@/entities/organization"
import { Button } from "@/shared/ui/button"
import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"

interface OrganizationShowcaseHeaderProps {
    organization: OrganizationShowcaseOrganization
    showCTA: boolean
    isMember: boolean
    isAdmin: boolean
    onSendRequest?: () => void
    onSendRequestIntent?: () => void
}

async function copyShareLink({
    errorMessage,
    successMessage,
    url,
}: {
    errorMessage: string
    successMessage: string
    url: string
}): Promise<void> {
    try {
        await navigator.clipboard.writeText(url)
        showSuccessToast(successMessage)
    } catch {
        showRetryErrorToast(errorMessage, {
            onRetry: () => copyShareLink({ errorMessage, successMessage, url }),
        })
    }
}

export function OrganizationShowcaseHeader({
    organization,
    showCTA,
    isMember,
    isAdmin,
    onSendRequest,
    onSendRequestIntent,
}: OrganizationShowcaseHeaderProps) {
    const { t } = useTranslation("organization-showcase")
    const handleShare = () => {
        void copyShareLink({
            errorMessage: t("header.copyError"),
            successMessage: t("header.copySuccess"),
            url: window.location.href,
        })
    }

    return (
        <div className="w-full border-ds-surface-border border-b">
            <div className="mx-auto max-w-[theme(width.3xl)] py-10">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ds-surface-border bg-ds-surface">
                            {organization.logo && (
                                <img
                                    src={organization.logo}
                                    alt={`${organization.name} logo`}
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            )}
                        </div>
                        <h1 className="font-semibold text-2xl text-ds-fg tracking-tight">
                            {organization.name}
                        </h1>
                    </div>

                    {showCTA && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="lg" className="shrink-0">
                                {t("header.contactSupport")}
                            </Button>
                            <Button
                                variant="solid"
                                size="lg"
                                className="shrink-0"
                                onClick={onSendRequest}
                                onFocus={onSendRequestIntent}
                                onPointerDown={onSendRequestIntent}
                                onPointerEnter={onSendRequestIntent}
                            >
                                {t("header.sendRequest")}
                            </Button>
                        </div>
                    )}

                    {isMember && (
                        <Button
                            variant="outline"
                            size="lg"
                            className="shrink-0"
                            onClick={handleShare}
                        >
                            {t("header.share")}
                            <Share2 className="size-4" />
                        </Button>
                    )}
                </div>

                {organization.tagline ? (
                    <p className="mt-3 text-ds-fg-muted text-sm">{organization.tagline}</p>
                ) : isAdmin ? (
                    <p className="mt-3 text-ds-fg-muted text-sm">
                        {t("header.noTagline")}{" "}
                        <Link
                            to="/org/$slug/settings"
                            params={{ slug: organization.slug }}
                            hash="tagline"
                            className="text-ds-link underline underline-offset-4 hover:text-ds-link-hover"
                        >
                            {t("header.addTagline")}
                        </Link>
                    </p>
                ) : null}
            </div>
        </div>
    )
}
