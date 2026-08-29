import { Link } from "@tanstack/react-router"
import { TableOfContents } from "./table-of-contents"

interface TocItem {
    id: string
    text: string
    level: number
}

interface LegalPageLayoutProps {
    title: string
    introduction: string
    lastUpdated: string
    tocItems: TocItem[]
    children: React.ReactNode
}

const LEGAL_PAGES = [
    {
        title: "Privacy Policy",
        href: "/privacy",
        description: "Learn how we collect, use, and protect your data",
    },
    {
        title: "Terms of Service",
        href: "/terms",
        description: "Terms and conditions for using Ortelius Quest",
    },
    {
        title: "Cookie Policy",
        href: "/cookies",
        description: "How we use cookies and similar technologies",
    },
]

export function LegalPageLayout({
    title,
    introduction,
    lastUpdated,
    tocItems,
    children,
}: LegalPageLayoutProps) {
    const otherPages = LEGAL_PAGES.filter((page) => page.title !== title)

    return (
        <article className="min-w-0">
            <header className="mb-12 max-w-3xl pb-2">
                <h1 className="mb-2 font-semibold text-[40px] text-ds-fg tracking-tight">
                    {title}
                </h1>
                <p className="mb-16 text-ds-fg-muted text-sm">Last updated: {lastUpdated}</p>
                <p className="font-normal text-base text-ds-fg leading-[1.4]">{introduction}</p>
            </header>
            <div className="flex justify-between">
                <div className="prose prose-neutral max-w-2xl text-base leading-7 [&_h2:first-of-type]:mt-0 [&_h2]:mb-4 [&_h2]:font-semibold [&_h2]:text-ds-fg [&_h2]:text-xl [&_h2~h2]:mt-12 [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-semibold [&_h3]:text-ds-fg [&_h3]:text-lg [&_li]:pl-2 [&_li]:text-ds-fg [&_p]:mb-4 [&_p]:text-ds-fg-muted [&_strong]:font-semibold [&_strong]:text-ds-fg [&_ul]:my-6 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-4">
                    {children}
                </div>
                <aside className="lg:pl-8">
                    <TableOfContents items={tocItems} />
                </aside>
            </div>

            {otherPages.length > 0 && (
                <section className="mt-16 max-w-2xl border-ds-surface-border border-t pt-12">
                    <h2 className="mb-6 font-semibold text-ds-fg text-xl">Continue exploring</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {otherPages.map((page) => (
                            <Link
                                key={page.href}
                                to={page.href}
                                className="group rounded-sm border border-ds-surface-border bg-ds-surface p-4 transition-colors hover:border-ds-surface-border hover:bg-ds-surface-hover"
                            >
                                <h3 className="mb-2 font-semibold text-base text-ds-fg">
                                    {page.title}
                                </h3>
                                <p className="text-ds-fg-muted text-sm">{page.description}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </article>
    )
}
