import { Link } from "@tanstack/react-router"
import { FileText } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Components } from "react-markdown"
import Markdown from "react-markdown"
import { Button } from "@/shared/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"

interface OrganizationShowcaseOverviewProps {
    overview: string
}

const textStyle = { fontSize: 16, lineHeight: 1.7, fontWeight: 400 } as const
const headingStyle = { lineHeight: 1.4, fontWeight: 600 } as const

const markdownComponents: Components = {
    h1: ({ children }) => (
        <h1 style={{ ...headingStyle, fontSize: 20 }} className="mt-8 mb-2 text-ds-fg">
            {children}
        </h1>
    ),
    h2: ({ children }) => (
        <h2 style={{ ...headingStyle, fontSize: 20 }} className="mt-8 mb-2 text-ds-fg">
            {children}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 style={{ ...headingStyle, fontSize: 20 }} className="mt-8 mb-2 text-ds-fg">
            {children}
        </h3>
    ),
    h4: ({ children }) => (
        <h4 style={{ ...headingStyle, fontSize: 16 }} className="mt-6 mb-2 text-ds-fg">
            {children}
        </h4>
    ),
    p: ({ children }) => (
        <p style={textStyle} className="mb-4 text-ds-fg last:mb-0">
            {children}
        </p>
    ),
    ul: ({ children }) => (
        <ul style={textStyle} className="mb-4 list-disc pl-6 text-ds-fg last:mb-0">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol style={textStyle} className="mb-4 list-decimal pl-6 text-ds-fg last:mb-0">
            {children}
        </ol>
    ),
    li: ({ children }) => (
        <li style={textStyle} className="mb-2 text-ds-fg last:mb-0">
            {children}
        </li>
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
    a: ({ children, href }) => (
        <a href={href} className="text-ds-link underline" target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="mb-4 border-ds-surface-border border-l-2 py-3 pl-5 text-ds-fg-muted italic last:mb-0">
            {children}
        </blockquote>
    ),
    hr: () => <hr className="my-8 border-ds-surface-border" />,
    table: ({ children }) => (
        <div className="mb-4 overflow-x-auto last:mb-0">
            <table className="w-full border-collapse text-sm">{children}</table>
        </div>
    ),
    th: ({ children }) => (
        <th className="border border-ds-surface-border bg-ds-canvas px-4 py-2 text-left font-semibold text-ds-fg text-sm">
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="border border-ds-surface-border px-4 py-2 text-ds-fg text-sm">{children}</td>
    ),
    code: ({ children, className }) => {
        if (className?.includes("language-")) {
            return (
                <pre className="mb-4 overflow-x-auto rounded-md bg-ds-canvas p-4 last:mb-0">
                    <code className="text-sm">{children}</code>
                </pre>
            )
        }
        return <code className="rounded bg-ds-canvas px-1.5 py-0.5 text-sm">{children}</code>
    },
    pre: ({ children }) => (
        <pre className="mb-4 overflow-x-auto rounded-md bg-ds-canvas p-4 last:mb-0">{children}</pre>
    ),
}

export function OrganizationShowcaseOverview({ overview }: OrganizationShowcaseOverviewProps) {
    const { t } = useTranslation("organization-showcase")

    return (
        <section>
            <h2 className="font-semibold text-ds-fg text-xl">{t("overview.title")}</h2>
            <div className="[&>*:first-child]:!mt-0 mt-4 max-w-none text-ds-fg">
                <Markdown components={markdownComponents}>{overview}</Markdown>
            </div>
        </section>
    )
}

interface OrganizationShowcaseOverviewEmptyProps {
    slug: string
}

export function OrganizationShowcaseOverviewEmpty({
    slug,
}: OrganizationShowcaseOverviewEmptyProps) {
    const { t } = useTranslation("organization-showcase")
    return (
        <section>
            <h2 className="font-semibold text-ds-fg text-xl">{t("overview.title")}</h2>
            <div className="mt-4">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FileText />
                        </EmptyMedia>
                        <EmptyTitle>{t("overview.emptyTitle")}</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button asChild variant="solid" size="sm" radius="full">
                            <Link to="/org/$slug/settings" params={{ slug }} hash="overview">
                                {t("overview.addOverview")}
                            </Link>
                        </Button>
                    </EmptyContent>
                </Empty>
            </div>
        </section>
    )
}
