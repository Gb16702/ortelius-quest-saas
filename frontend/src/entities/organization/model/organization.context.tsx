import { OrganizationUpdatedMessageSchema } from "@ortelius/websocket-types/messages"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useRouter } from "@tanstack/react-router"
import { createContext, use, useCallback, useEffect, useLayoutEffect, useState } from "react"
import {
    isAdminOrOwner,
    parseRole,
    type Role,
    useCurrentUserOrganizationRole,
} from "@/entities/access/@x/organization"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import { logError } from "@/shared/lib/error"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { organizationInfoKeys } from "../api/organization-info.query"
import {
    organizationLayoutShowcaseKeys,
    organizationWorkspaceBootstrapKeys,
} from "../api/organization-layout.query"
import type { OrganizationBrandColor } from "./organization-brand-color"
import { createOrganizationBrandColorCssVariables } from "./organization-brand-color"
import { applyOrganizationFontToDocument } from "./organization-document-font"
import type { OrganizationFontId } from "./organization-font"
import type { OrganizationInfo } from "./organization-info.schema"
import type { OrganizationLayoutInfo } from "./organization-showcase.schema"

export interface OrganizationWorkspaceSummary {
    id: string
    name: string
    slug: string
    logo: string | null
    brandColor: OrganizationBrandColor
    font: OrganizationFontId
    memberCount?: number | null
}

export type OrgInfo = OrganizationWorkspaceSummary

interface OrgContextState {
    org: OrganizationWorkspaceSummary
    role: Role
    isAdmin: boolean
}

interface OrgContextMeta {
    slug: string
}

interface OrgContextValue {
    state: OrgContextState
    meta: OrgContextMeta
    actions: {
        applyOrganizationUpdate: (update: OrganizationUpdateInput) => void
    }
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function useOrg(): OrgContextValue {
    const ctx = use(OrgContext)
    if (!ctx) throw new Error("useOrg must be used within an OrgProvider")
    return ctx
}

export function useOrgOptional(): OrgContextValue | null {
    return use(OrgContext)
}

interface OrgProviderProps {
    org: OrganizationWorkspaceSummary
    role: Role
    userId?: string | null
    slug: string
    children: React.ReactNode
}

interface OrganizationUpdateInput {
    name?: string
    slug?: string
    previousSlug?: string | null
    logo?: string | null
    brandLogo?: string | null
    tagline?: string | null
    brandColor?: string
    font?: string
}

interface OrgWorkspaceBootstrapCacheData {
    organizationBySlug?: {
        id?: string
        name?: string
        slug?: string
        logo?: string | null
        brandColor?: string
        font?: string
    } | null
}

function coerceOrganizationFont(value: string | undefined, fallback: OrganizationFontId) {
    return value ? (value as OrganizationFontId) : fallback
}

function coerceOrganizationBrandColor(value: string | undefined, fallback: OrganizationBrandColor) {
    return value ? (value as OrganizationBrandColor) : fallback
}

function rewriteOrgSlugPathname(pathname: string, fromSlug: string, toSlug: string): string {
    const prefix = `/org/${fromSlug}`
    if (!pathname.startsWith(prefix)) return pathname

    return `/org/${toSlug}${pathname.slice(prefix.length)}`
}

function buildLocationHref(pathname: string, search: string, hash: string): string {
    return `${pathname}${search}${hash}`
}

export function OrgProvider({ org, role, userId, slug, children }: OrgProviderProps) {
    const queryClient = useQueryClient()
    const router = useRouter()
    const location = useLocation({
        select: (currentLocation) => ({
            pathname: currentLocation.pathname,
            search: currentLocation.searchStr,
            hash: currentLocation.hash,
        }),
    })
    const { subscribe } = useWebSocket()
    const [liveOrg, setLiveOrg] = useState(org)
    const [liveSlug, setLiveSlug] = useState(slug)
    const { data: liveRole = role } = useCurrentUserOrganizationRole(
        { organizationId: org.id, userId },
        { initialData: role }
    )
    const parsedRole = parseRole(liveRole)
    const isAdmin = parsedRole ? isAdminOrOwner(parsedRole) : false
    const brandColor = liveOrg.brandColor
    const font = liveOrg.font

    useEffect(() => {
        setLiveOrg(org)
        setLiveSlug(slug)
    }, [org, slug])

    const applyOrganizationUpdate = useCallback(
        (update: OrganizationUpdateInput) => {
            const previousSlug = update.previousSlug ?? liveSlug

            setLiveOrg((currentOrg) => ({
                ...currentOrg,
                name: update.name ?? currentOrg.name,
                slug: update.slug ?? currentOrg.slug,
                logo: update.logo === undefined ? currentOrg.logo : update.logo,
                brandColor: coerceOrganizationBrandColor(update.brandColor, currentOrg.brandColor),
                font: coerceOrganizationFont(update.font, currentOrg.font),
            }))

            if (update.slug) {
                setLiveSlug(update.slug)
            }

            queryClient.setQueryData<OrganizationInfo>(
                organizationInfoKeys.detail(org.id),
                (currentInfo) =>
                    currentInfo
                        ? {
                              ...currentInfo,
                              name: update.name ?? currentInfo.name,
                              slug: update.slug ?? currentInfo.slug,
                              logo: update.logo === undefined ? currentInfo.logo : update.logo,
                              tagline:
                                  update.tagline === undefined
                                      ? currentInfo.tagline
                                      : update.tagline,
                              brandColor: coerceOrganizationBrandColor(
                                  update.brandColor,
                                  currentInfo.brandColor
                              ),
                              font: coerceOrganizationFont(update.font, currentInfo.font),
                          }
                        : currentInfo
            )

            const patchLayout = (currentLayout: OrganizationLayoutInfo | undefined) =>
                currentLayout?.id === org.id
                    ? {
                          ...currentLayout,
                          name: update.name ?? currentLayout.name,
                          slug: update.slug ?? currentLayout.slug,
                          logo: update.logo === undefined ? currentLayout.logo : update.logo,
                          tagline:
                              update.tagline === undefined ? currentLayout.tagline : update.tagline,
                          brandColor: coerceOrganizationBrandColor(
                              update.brandColor,
                              currentLayout.brandColor
                          ),
                          font: coerceOrganizationFont(update.font, currentLayout.font),
                      }
                    : currentLayout

            queryClient.setQueryData(organizationLayoutShowcaseKeys.detail(liveSlug), patchLayout)
            if (previousSlug && previousSlug !== liveSlug) {
                queryClient.setQueryData(
                    organizationLayoutShowcaseKeys.detail(previousSlug),
                    patchLayout
                )
            }
            if (update.slug && update.slug !== liveSlug) {
                queryClient.setQueryData(
                    organizationLayoutShowcaseKeys.detail(update.slug),
                    patchLayout
                )
            }

            const patchBootstrap = (
                currentBootstrap: OrgWorkspaceBootstrapCacheData | undefined
            ) => {
                if (currentBootstrap?.organizationBySlug?.id !== org.id) {
                    return currentBootstrap
                }

                return {
                    ...currentBootstrap,
                    organizationBySlug: {
                        ...currentBootstrap.organizationBySlug,
                        name: update.name ?? currentBootstrap.organizationBySlug.name,
                        slug: update.slug ?? currentBootstrap.organizationBySlug.slug,
                        logo:
                            update.logo === undefined
                                ? currentBootstrap.organizationBySlug.logo
                                : update.logo,
                        brandColor:
                            update.brandColor ?? currentBootstrap.organizationBySlug.brandColor,
                        font: update.font ?? currentBootstrap.organizationBySlug.font,
                    },
                }
            }

            const currentBootstrap =
                queryClient.getQueryData<OrgWorkspaceBootstrapCacheData>(
                    organizationWorkspaceBootstrapKeys.detail(liveSlug)
                ) ??
                (previousSlug
                    ? queryClient.getQueryData<OrgWorkspaceBootstrapCacheData>(
                          organizationWorkspaceBootstrapKeys.detail(previousSlug)
                      )
                    : undefined)

            queryClient.setQueriesData<OrgWorkspaceBootstrapCacheData>(
                { queryKey: organizationWorkspaceBootstrapKeys.all },
                patchBootstrap
            )

            if (update.slug && currentBootstrap?.organizationBySlug?.id === org.id) {
                queryClient.setQueryData(
                    organizationWorkspaceBootstrapKeys.detail(update.slug),
                    patchBootstrap(currentBootstrap)
                )
            }
        },
        [liveSlug, org.id, queryClient]
    )

    useEffect(() => {
        return subscribe((message) => {
            if (message.type !== "organization:updated") return

            const result = safeParseSchema(OrganizationUpdatedMessageSchema, message)
            if (!result.success) {
                logError("Invalid organization:updated WebSocket payload", result.error)
                return
            }

            const nextOrganization = result.data.organization
            if (nextOrganization.id !== org.id) return

            applyOrganizationUpdate({
                name: nextOrganization.name,
                slug: nextOrganization.slug,
                previousSlug: result.data.previousSlug ?? null,
                logo: nextOrganization.logo,
                brandLogo: nextOrganization.brandLogo,
                tagline: nextOrganization.tagline,
                brandColor: nextOrganization.brandColor,
                font: nextOrganization.font,
            })

            const previousSlug = result.data.previousSlug
            if (!previousSlug || previousSlug === nextOrganization.slug) return

            const nextPathname = rewriteOrgSlugPathname(
                location.pathname,
                previousSlug,
                nextOrganization.slug
            )
            if (nextPathname === location.pathname) return

            void router.navigate({
                href: buildLocationHref(nextPathname, location.search, location.hash),
                replace: true,
            })
        })
    }, [applyOrganizationUpdate, location, org.id, router, subscribe])

    useLayoutEffect(() => {
        const variables = createOrganizationBrandColorCssVariables(brandColor)
        const rootStyle = document.documentElement.style

        for (const [name, value] of Object.entries(variables)) {
            rootStyle.setProperty(name, String(value))
        }

        return () => {
            for (const name of Object.keys(variables)) {
                rootStyle.removeProperty(name)
            }
        }
    }, [brandColor])

    useLayoutEffect(() => applyOrganizationFontToDocument(font), [font])

    const value: OrgContextValue = {
        state: { org: liveOrg, role: liveRole, isAdmin },
        meta: { slug: liveSlug },
        actions: { applyOrganizationUpdate },
    }

    return <OrgContext value={value}>{children}</OrgContext>
}
