import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import { ChatsPageContent, ChatsPageProvider } from "@/features/chat"
import type { BreadcrumbNavItem } from "@/shared/ui/breadcrumb-nav"

interface OrgChatsPageProps {
    sessionData: SessionResponse | null
    hrefBasePath?: string
}

export function OrgChatsPage({ sessionData, hrefBasePath }: OrgChatsPageProps) {
    const { state, meta } = useOrg()
    const breadcrumbItemsPrefix: BreadcrumbNavItem[] = getOrgBreadcrumbItems(state.org, [])

    return (
        <ChatsPageProvider
            sessionData={sessionData}
            basePath={`/org/${meta.slug}`}
            hrefBasePath={hrefBasePath}
            breadcrumbItemsPrefix={breadcrumbItemsPrefix}
        >
            <ChatsPageContent />
        </ChatsPageProvider>
    )
}
