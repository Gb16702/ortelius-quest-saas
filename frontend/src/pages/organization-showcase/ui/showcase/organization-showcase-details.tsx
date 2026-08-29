import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import type { OrganizationShowcaseOrganization } from "@/entities/organization"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing-languages"
import { ExternalLinkIcon } from "@/shared/ui/icons/external-link-icon"

interface OrganizationShowcaseDetailsProps {
    organization: OrganizationShowcaseOrganization
    lang: SupportedLanguage
}

interface DetailRowProps {
    label: string
    value: string
    href?: string
    external?: boolean
}

function formatDate(dateString: string, locale: string): string {
    return new Date(dateString).toLocaleDateString(locale, {
        month: "short",
        year: "numeric",
    })
}

function DetailRow({ label, value, href, external }: DetailRowProps) {
    return (
        <div className="flex items-center justify-between border-ds-surface-border border-t py-4 first:border-t-0">
            <span className="font-normal text-ds-fg text-sm">{label}</span>
            {href ? (
                external ? (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ds-link text-sm hover:text-ds-link-hover hover:[background:linear-gradient(currentColor,currentColor)_0_100%/100%_1px_no-repeat]"
                    >
                        {value} <ExternalLinkIcon className="inline size-4" />
                    </a>
                ) : (
                    <Link
                        to={href}
                        className="text-ds-link text-sm hover:text-ds-link-hover hover:[background:linear-gradient(currentColor,currentColor)_0_100%/100%_1px_no-repeat]"
                    >
                        {value}
                    </Link>
                )
            ) : (
                <span className="text-ds-fg text-sm">{value}</span>
            )}
        </div>
    )
}

export function OrganizationShowcaseDetails({
    organization,
    lang,
}: OrganizationShowcaseDetailsProps) {
    const { t } = useTranslation("organization-showcase")

    return (
        <aside className="sticky top-8">
            <h2 className="font-semibold text-[20px] text-ds-fg">{t("details.title")}</h2>
            <div className="mt-2">
                <DetailRow label={t("details.organization")} value={organization.name} />
                <DetailRow
                    label={t("details.members")}
                    value={organization.memberCount.toLocaleString(lang)}
                />
                <DetailRow
                    label={t("details.activeSince")}
                    value={formatDate(organization.createdAt, lang)}
                />
                {organization.website && (
                    <DetailRow
                        label={t("details.website")}
                        value={organization.website.replace(/^https?:\/\//, "")}
                        href={organization.website}
                        external
                    />
                )}
            </div>
        </aside>
    )
}
