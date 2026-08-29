import type { BreadcrumbNavItem } from "@/shared/ui/breadcrumb-nav"

interface OrgBreadcrumbInfo {
    name: string
    slug: string
}

export function getOrgBreadcrumbItems(
    org: OrgBreadcrumbInfo | null | undefined,
    items: BreadcrumbNavItem[]
): BreadcrumbNavItem[] {
    if (!org) return items

    return [
        {
            label: org.name,
            href: `/org/${org.slug}`,
        },
        ...items,
    ]
}
