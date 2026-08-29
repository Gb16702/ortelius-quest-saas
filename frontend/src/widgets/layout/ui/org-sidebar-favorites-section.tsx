import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "@tanstack/react-router"
import {
    Bot,
    Check,
    ChevronRight,
    Copy,
    FileText,
    Folder,
    FolderOpen,
    FolderPlus,
    MessageSquare,
    MessagesSquare,
    Minus,
    MoreHorizontal,
    Pencil,
    ReceiptText,
    SquareDashed,
    Star,
} from "lucide-react"
import type {
    ComponentPropsWithRef,
    CSSProperties,
    ReactNode,
    PointerEvent as ReactPointerEvent,
} from "react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import {
    type FavoriteGroup,
    type FavoriteGroupPositionUpdate,
    type FavoriteItem,
    type FavoritePlacementUpdate,
    useCreateFavoriteGroup,
    useDeleteFavoriteGroup,
    useFavorites,
    useFavoriteToggle,
    useRenameFavoriteGroup,
    useReorderFavorites,
} from "@/entities/favorite"
import { PresenceIndicator } from "@/entities/presence"
import { type Conversation, orgSidebarMemberConversationsQueryOptions } from "@/features/chat"
import {
    requestQuestAssistantConversationOpen,
    setAssistantThreadParamInLocation,
} from "@/features/quest-assistant"
import { cn } from "@/shared/lib/class-names"
import {
    readSidebarSectionPreference,
    writeSidebarSectionPreference,
} from "@/shared/lib/sidebar-section-preference"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarInput,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/shared/ui/sidebar"
import { showErrorToast, showSuccessToast, showUndoToast } from "@/shared/ui/toasts"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import {
    getFavoriteConversationType,
    getFavoriteDisplayLabel,
} from "../lib/org-sidebar-favorite-display"

const favoritesSectionAnimationCurve = "cubic-bezier(0.2, 0, 0, 1)"
const rootFavoriteContainerId = "favorite-root"
const favoritePositionStep = 1000
const favoriteDragActivationDistancePx = 6
const favoriteDragCursorAnchorX = 56
const favoriteLayoutAnimationDurationMs = 180
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

interface OrgSidebarFavoritesSectionProps {
    organizationId: string
    organizationName: string
    currentUserId: string
    slug: string
    onNavigationIntent: (href: string, intent: "click" | "focus" | "hover", label: string) => void
}

interface CurrentLocation {
    pathname: string
    search: string
    hash: string
}

interface FavoriteContainer {
    id: string
    groupId: string | null
    favorites: FavoriteItem[]
}

type FavoriteTopLevelEntry =
    | { kind: "favorite"; id: string; favorite: FavoriteItem; position: number; createdAt: string }
    | { kind: "group"; id: string; group: FavoriteGroup; position: number; createdAt: string }

type FavoriteDropPlacement = "before" | "after"

interface RenderFavoriteOptions {
    favorite: FavoriteItem
    href: string
    label: string
    conversation?: Conversation
}

interface FavoriteDropTarget {
    overId: string
    placement?: FavoriteDropPlacement
    scope?: "container" | "top-level"
}

interface FavoriteDragRowRect {
    id: string
    top: number
    bottom: number
    height: number
}

interface FavoriteDragFavoriteRect extends FavoriteDragRowRect {
    containerId: string | null
    isTopLevel: boolean
}

interface FavoriteDragGroupRect extends FavoriteDragRowRect {
    groupId: string | null
}

interface FavoriteDragContainerRect extends FavoriteDragRowRect {
    containerId: string
}

interface FavoriteDragLayoutSnapshot {
    favoriteRows: FavoriteDragFavoriteRect[]
    groupRows: FavoriteDragGroupRect[]
    topLevelRows: FavoriteDragRowRect[]
    containers: FavoriteDragContainerRect[]
}

interface FavoriteDragVisualSnapshot {
    width: number
    height: number
}

interface FavoriteDragVisualState {
    id: string
    width: number
    height: number
}

interface FavoriteLayoutAnimationRect {
    top: number
    left: number
}

interface FavoriteLayoutAnimationOptions {
    includeDragging?: boolean
}

type FavoriteLayoutAnimationSnapshot = Map<string, FavoriteLayoutAnimationRect>

type FavoriteDragSession =
    | {
          kind: "favorite"
          id: string
          startX: number
          startY: number
          isActive: boolean
          layout: FavoriteDragLayoutSnapshot | null
          visual: FavoriteDragVisualSnapshot | null
      }
    | {
          kind: "group"
          id: string
          startX: number
          startY: number
          isActive: boolean
          layout: FavoriteDragLayoutSnapshot | null
          visual: FavoriteDragVisualSnapshot | null
      }

function getOrgFavoritesSectionPreferenceId(organizationId: string): string {
    return `org:${organizationId}:favorites`
}

function getOrgFavoriteGroupPreferenceId(organizationId: string, groupId: string): string {
    return `org:${organizationId}:favorite-group:${groupId}`
}

function getFavoriteSortableId(favorite: FavoriteItem): string {
    return `favorite:${favorite.entityType}:${favorite.entityId}`
}

function getFavoriteGroupContainerId(groupId: string): string {
    return `favorite-group:${groupId}`
}

function getFavoriteGroupTopLevelId(groupId: string): string {
    return `group:${groupId}`
}

function getContainerGroupId(containerId: string): string | null {
    return containerId === rootFavoriteContainerId
        ? null
        : containerId.replace("favorite-group:", "")
}

function getFavoriteHref(
    favorite: FavoriteItem,
    slug: string,
    currentLocation: CurrentLocation
): string {
    const requestNumber =
        typeof favorite.meta?.requestNumber === "string" ? favorite.meta.requestNumber : null

    if (favorite.entityType === "conversation") {
        return `/org/${slug}/chat/${encodeURIComponent(favorite.entityId)}`
    }

    if (favorite.entityType === "assistant_conversation") {
        return getAssistantConversationHref(favorite.entityId, currentLocation)
    }

    if (favorite.entityType === "member") {
        return getMemberProfileHref(favorite.entityId, currentLocation, slug)
    }

    if (requestNumber) {
        return `/org/${slug}/requests?request=${encodeURIComponent(requestNumber)}`
    }

    if (favorite.entityType === "invoice") {
        return `/org/${slug}/settings/invoices?invoice=${encodeURIComponent(favorite.entityId)}`
    }

    return `/org/${slug}/requests`
}

function getAssistantConversationHref(
    conversationId: string,
    currentLocation: CurrentLocation
): string {
    return setAssistantThreadParamInLocation(currentLocation, conversationId)
}

function getMemberProfileHref(
    userId: string,
    currentLocation: CurrentLocation,
    slug: string
): string {
    const pathname = currentLocation.pathname.startsWith(`/org/${slug}`)
        ? currentLocation.pathname
        : `/org/${slug}/dashboard`
    const searchParams = new URLSearchParams(currentLocation.search)
    searchParams.set("profile", userId)
    const search = searchParams.toString()

    return `${pathname}${search ? `?${search}` : ""}${currentLocation.hash}`
}

function sortFavoritesByPosition(favorites: FavoriteItem[]): FavoriteItem[] {
    return [...favorites].sort(
        (a, b) =>
            (a.position ?? 0) - (b.position ?? 0) ||
            Date.parse(b.createdAt) - Date.parse(a.createdAt)
    )
}

function buildFavoriteContainers(
    favorites: FavoriteItem[],
    groups: FavoriteGroup[]
): FavoriteContainer[] {
    const groupIds = new Set(groups.map((group) => group.id))
    const rootFavorites = favorites.filter(
        (favorite) => !favorite.groupId || !groupIds.has(favorite.groupId)
    )
    const containers: FavoriteContainer[] = [
        {
            id: rootFavoriteContainerId,
            groupId: null,
            favorites: sortFavoritesByPosition(rootFavorites),
        },
    ]

    for (const group of groups) {
        containers.push({
            id: getFavoriteGroupContainerId(group.id),
            groupId: group.id,
            favorites: sortFavoritesByPosition(
                favorites.filter((favorite) => favorite.groupId === group.id)
            ),
        })
    }

    return containers
}

function buildFavoriteTopLevelPlacementUpdates(
    containers: FavoriteContainer[]
): FavoritePlacementUpdate[] {
    return containers.flatMap((container) =>
        container.favorites.map((favorite, index) => ({
            entityType: favorite.entityType,
            entityId: favorite.entityId,
            groupId: container.groupId,
            position:
                container.id === rootFavoriteContainerId
                    ? (favorite.position ?? index * favoritePositionStep)
                    : index * favoritePositionStep,
        }))
    )
}

function buildFavoriteTopLevelGroupPositionUpdates(
    groups: FavoriteGroup[]
): FavoriteGroupPositionUpdate[] {
    return groups.map((group, index) => ({
        id: group.id,
        position: group.position ?? index * favoritePositionStep,
    }))
}

function buildFavoriteTopLevelEntries(
    rootFavorites: FavoriteItem[],
    groups: FavoriteGroup[]
): FavoriteTopLevelEntry[] {
    return [
        ...rootFavorites.map((favorite) => ({
            kind: "favorite" as const,
            id: getFavoriteSortableId(favorite),
            favorite,
            position: favorite.position ?? 0,
            createdAt: favorite.createdAt,
        })),
        ...groups.map((group) => ({
            kind: "group" as const,
            id: getFavoriteGroupTopLevelId(group.id),
            group,
            position: group.position ?? 0,
            createdAt: group.createdAt,
        })),
    ].sort(
        (a, b) =>
            a.position - b.position ||
            (a.kind === b.kind ? 0 : a.kind === "favorite" ? -1 : 1) ||
            Date.parse(a.createdAt) - Date.parse(b.createdAt)
    )
}

function applyFavoriteTopLevelPositions({
    containers,
    groups,
    entries,
}: {
    containers: FavoriteContainer[]
    groups: FavoriteGroup[]
    entries: FavoriteTopLevelEntry[]
}): { containers: FavoriteContainer[]; groups: FavoriteGroup[] } {
    const topLevelPositionById = new Map(
        entries.map((entry, index) => [entry.id, index * favoritePositionStep])
    )

    return {
        containers: containers.map((container) =>
            container.id === rootFavoriteContainerId
                ? {
                      ...container,
                      favorites: container.favorites
                          .map((favorite) => ({
                              ...favorite,
                              position:
                                  topLevelPositionById.get(getFavoriteSortableId(favorite)) ??
                                  favorite.position ??
                                  0,
                          }))
                          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
                  }
                : container
        ),
        groups: groups
            .map((group) => ({
                ...group,
                position:
                    topLevelPositionById.get(getFavoriteGroupTopLevelId(group.id)) ??
                    group.position ??
                    0,
            }))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    }
}

function moveFavoriteTopLevelGroup({
    containers,
    groups,
    activeGroupId,
    overTopLevelId,
    placement = "before",
}: {
    containers: FavoriteContainer[]
    groups: FavoriteGroup[]
    activeGroupId: string
    overTopLevelId: string
    placement?: FavoriteDropPlacement
}): { containers: FavoriteContainer[]; groups: FavoriteGroup[] } | null {
    const activeTopLevelId = getFavoriteGroupTopLevelId(activeGroupId)
    if (activeTopLevelId === overTopLevelId) return null

    const rootFavorites =
        containers.find((container) => container.id === rootFavoriteContainerId)?.favorites ?? []
    const entries = buildFavoriteTopLevelEntries(rootFavorites, groups)
    const activeIndex = entries.findIndex((entry) => entry.id === activeTopLevelId)
    if (activeIndex < 0) return null

    const nextEntries = [...entries]
    const [activeEntry] = nextEntries.splice(activeIndex, 1)
    if (!activeEntry) return null

    const targetIndex = nextEntries.findIndex((entry) => entry.id === overTopLevelId)
    const insertIndex =
        targetIndex >= 0
            ? Math.min(targetIndex + (placement === "after" ? 1 : 0), nextEntries.length)
            : nextEntries.length
    nextEntries.splice(insertIndex, 0, activeEntry)

    return applyFavoriteTopLevelPositions({ containers, groups, entries: nextEntries })
}

function moveFavoriteToTopLevel({
    containers,
    groups,
    activeFavorite,
    activeId,
    overTopLevelId,
    placement = "before",
}: {
    containers: FavoriteContainer[]
    groups: FavoriteGroup[]
    activeFavorite: FavoriteItem
    activeId: string
    overTopLevelId: string
    placement?: FavoriteDropPlacement
}): { containers: FavoriteContainer[]; groups: FavoriteGroup[] } | null {
    if (activeId === overTopLevelId) return null

    const containersWithoutActive = containers.map((container) => ({
        ...container,
        favorites: container.favorites.filter(
            (favorite) => getFavoriteSortableId(favorite) !== activeId
        ),
    }))
    const rootContainer = containersWithoutActive.find(
        (container) => container.id === rootFavoriteContainerId
    )
    if (!rootContainer) return null

    const entries = buildFavoriteTopLevelEntries(rootContainer.favorites, groups)
    const activeEntry: FavoriteTopLevelEntry = {
        kind: "favorite",
        id: activeId,
        favorite: { ...activeFavorite, groupId: null },
        position: activeFavorite.position ?? 0,
        createdAt: activeFavorite.createdAt,
    }

    const targetIndex = entries.findIndex((entry) => entry.id === overTopLevelId)
    const insertIndex =
        targetIndex >= 0
            ? Math.min(targetIndex + (placement === "after" ? 1 : 0), entries.length)
            : placement === "before"
              ? 0
              : entries.length
    const nextEntries = [...entries]
    nextEntries.splice(insertIndex, 0, activeEntry)
    rootContainer.favorites = [...rootContainer.favorites, activeEntry.favorite]

    return applyFavoriteTopLevelPositions({
        containers: containersWithoutActive,
        groups,
        entries: nextEntries,
    })
}

function getContainerIdForFavorite(containers: FavoriteContainer[], sortableId: string) {
    return containers.find((container) =>
        container.favorites.some((favorite) => getFavoriteSortableId(favorite) === sortableId)
    )?.id
}

function moveFavoriteInContainers({
    containers,
    activeFavorite,
    activeId,
    overId,
    placement = "before",
}: {
    containers: FavoriteContainer[]
    activeFavorite: FavoriteItem
    activeId: string
    overId: string
    placement?: FavoriteDropPlacement
}): FavoriteContainer[] | null {
    if (activeId === overId) return null

    const sourceContainerId = getContainerIdForFavorite(containers, activeId)
    const targetContainerId =
        overId === rootFavoriteContainerId || overId.startsWith("favorite-group:")
            ? overId
            : getContainerIdForFavorite(containers, overId)

    if (!sourceContainerId || !targetContainerId) return null

    const nextContainers = containers.map((container) => ({
        ...container,
        favorites: container.favorites.filter(
            (favorite) => getFavoriteSortableId(favorite) !== activeId
        ),
    }))
    const targetContainer = nextContainers.find((container) => container.id === targetContainerId)
    if (!targetContainer) return null

    const overIndex = targetContainer.favorites.findIndex(
        (favorite) => getFavoriteSortableId(favorite) === overId
    )
    const nextFavorite = {
        ...activeFavorite,
        groupId: getContainerGroupId(targetContainerId),
    }
    const insertIndex =
        overIndex >= 0
            ? Math.min(
                  overIndex + (placement === "after" ? 1 : 0),
                  targetContainer.favorites.length
              )
            : targetContainer.favorites.length
    targetContainer.favorites.splice(insertIndex, 0, nextFavorite)

    return nextContainers
}

function getFavoriteContainersSignature(containers: FavoriteContainer[]): string {
    return containers
        .map(
            (container) =>
                `${container.id}:${container.favorites.map(getFavoriteSortableId).join(",")}`
        )
        .join("|")
}

function getFavoriteGroupsSignature(groups: FavoriteGroup[]): string {
    return groups.map((group) => group.id).join(",")
}

function isSameFavoriteDropTarget(
    first: FavoriteDropTarget | null,
    second: FavoriteDropTarget | null
): boolean {
    return (
        first?.overId === second?.overId &&
        first?.placement === second?.placement &&
        first?.scope === second?.scope
    )
}

function getFavoriteGroupPlacementForRect(
    rect: Pick<DOMRect, "top" | "height">,
    pointerY: number
): FavoriteDropPlacement {
    const middle = rect.top + rect.height / 2

    return pointerY > middle ? "after" : "before"
}

function getFavoriteGroupHeaderDropTarget(
    group: FavoriteDragGroupRect,
    pointerY: number
): FavoriteDropTarget {
    return {
        overId: group.id,
        placement: pointerY > group.top + group.height / 2 ? "after" : "before",
        scope: "top-level",
    }
}

function getNearestTopLevelDropTargetFromRows(
    topLevelRows: FavoriteDragRowRect[],
    activeTopLevelId: string,
    pointerY: number
): FavoriteDropTarget | null {
    const rows = topLevelRows
        .filter((row) => row.id !== activeTopLevelId)
        .sort((first, second) => first.top - second.top)
    const firstRow = rows[0]
    const lastRow = rows.at(-1)
    if (!firstRow || !lastRow) return null

    if (pointerY <= firstRow.top + firstRow.height / 2) {
        return { overId: firstRow.id, placement: "before", scope: "top-level" }
    }
    if (pointerY >= lastRow.top + lastRow.height / 2) {
        return { overId: lastRow.id, placement: "after", scope: "top-level" }
    }

    for (const row of rows) {
        if (pointerY <= row.top + row.height / 2) {
            return { overId: row.id, placement: "before", scope: "top-level" }
        }
    }

    return { overId: lastRow.id, placement: "after", scope: "top-level" }
}

function getDomRect(element: Element): FavoriteDragRowRect {
    const rect = element.getBoundingClientRect()
    return {
        id: "",
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
    }
}

function captureFavoriteDragVisualSnapshot(handle: HTMLElement): FavoriteDragVisualSnapshot | null {
    const row = handle.closest<HTMLElement>("[data-favorite-layout-id]")
    if (!row) return null

    const rect = row.getBoundingClientRect()
    return {
        width: rect.width,
        height: rect.height,
    }
}

function updateFavoriteDragVisualPosition(
    visual: FavoriteDragVisualSnapshot | null,
    pointerX: number,
    pointerY: number
) {
    if (!visual || typeof document === "undefined") return

    const style = document.documentElement.style
    const anchorX = Math.min(favoriteDragCursorAnchorX, visual.width / 2)
    style.setProperty("--favorite-drag-left", `${pointerX - anchorX}px`)
    style.setProperty("--favorite-drag-top", `${pointerY - visual.height / 2}px`)
}

function clearFavoriteDragVisualPosition() {
    if (typeof document === "undefined") return

    const style = document.documentElement.style
    style.removeProperty("--favorite-drag-left")
    style.removeProperty("--favorite-drag-top")
}

function getFavoriteDragPreviewStyle(dragVisual: FavoriteDragVisualState): CSSProperties {
    return {
        width: dragVisual.width,
        height: dragVisual.height,
        transform: "translate3d(var(--favorite-drag-left), var(--favorite-drag-top), 0)",
    }
}

function getFavoriteLayoutAnimationRows(): HTMLElement[] {
    if (typeof document === "undefined") return []

    return Array.from(document.querySelectorAll<HTMLElement>("[data-favorite-layout-id]"))
}

function clearFavoriteLayoutAnimationStyles() {
    for (const element of getFavoriteLayoutAnimationRows()) {
        element.style.transition = ""
        element.style.transform = ""
        element.style.willChange = ""
    }
}

function captureFavoriteLayoutAnimationSnapshot(
    options: FavoriteLayoutAnimationOptions = {}
): FavoriteLayoutAnimationSnapshot | null {
    if (typeof document === "undefined") return null

    const snapshot: FavoriteLayoutAnimationSnapshot = new Map()
    for (const element of getFavoriteLayoutAnimationRows()) {
        if (!options.includeDragging && element.dataset.favoriteIsDragging === "true") continue

        const id = element.dataset.favoriteLayoutId
        if (!id) continue

        const rect = element.getBoundingClientRect()
        snapshot.set(id, {
            top: rect.top,
            left: rect.left,
        })
    }

    return snapshot.size > 0 ? snapshot : null
}

function playFavoriteLayoutAnimation(snapshot: FavoriteLayoutAnimationSnapshot): boolean {
    const movedElements: HTMLElement[] = []

    for (const element of getFavoriteLayoutAnimationRows()) {
        if (element.dataset.favoriteIsDragging === "true") continue

        const id = element.dataset.favoriteLayoutId
        const previousRect = id ? snapshot.get(id) : undefined
        if (!previousRect) continue

        const nextRect = element.getBoundingClientRect()
        const deltaX = previousRect.left - nextRect.left
        const deltaY = previousRect.top - nextRect.top
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue

        element.style.transition = "none"
        element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`
        element.style.willChange = "transform"
        movedElements.push(element)
    }

    if (movedElements.length === 0) return false

    for (const element of movedElements) {
        element.getBoundingClientRect()
        element.style.transition = `transform ${favoriteLayoutAnimationDurationMs}ms ${favoritesSectionAnimationCurve}`
        element.style.transform = ""
    }

    return true
}

function captureFavoriteDragLayoutSnapshot(): FavoriteDragLayoutSnapshot {
    const favoriteRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-favorite-sortable-id]")
    )
        .map((element) => {
            const id = element.dataset.favoriteSortableId
            if (!id) return null
            const rect = getDomRect(element)
            return {
                ...rect,
                id,
                containerId:
                    element.closest<HTMLElement>("[data-favorite-container-id]")?.dataset
                        .favoriteContainerId ?? null,
                isTopLevel: Boolean(element.dataset.favoriteTopLevelId),
            }
        })
        .filter((row): row is FavoriteDragFavoriteRect => Boolean(row))
        .sort((first, second) => first.top - second.top)
    const groupRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-favorite-group-row-id]")
    )
        .map((element) => {
            const id = element.dataset.favoriteTopLevelId
            if (!id) return null
            const rect = getDomRect(element)
            return {
                ...rect,
                id,
                groupId: element.dataset.favoriteGroupRowId ?? null,
            }
        })
        .filter((row): row is FavoriteDragGroupRect => Boolean(row))
        .sort((first, second) => first.top - second.top)
    const topLevelRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-favorite-top-level-id]")
    )
        .map((element) => {
            const id = element.dataset.favoriteTopLevelId
            if (!id) return null
            const rect = getDomRect(element)
            return { ...rect, id }
        })
        .filter((row): row is FavoriteDragRowRect => Boolean(row))
        .sort((first, second) => first.top - second.top)
    const containers = Array.from(
        document.querySelectorAll<HTMLElement>("[data-favorite-container-id]")
    )
        .map((element) => {
            const containerId = element.dataset.favoriteContainerId
            if (!containerId) return null
            const rect = getDomRect(element)
            return {
                ...rect,
                id: containerId,
                containerId,
            }
        })
        .filter((row): row is FavoriteDragContainerRect => Boolean(row))
        .sort((first, second) => first.top - second.top)

    return { favoriteRows, groupRows, topLevelRows, containers }
}

function getFavoriteDropTargetFromSnapshot(
    snapshot: FavoriteDragLayoutSnapshot,
    activeId: string,
    pointerY: number
): FavoriteDropTarget | null {
    const groupRow = snapshot.groupRows.find(
        (row) => row.id !== activeId && pointerY >= row.top && pointerY <= row.bottom
    )
    if (groupRow) {
        const groupHeaderTarget = getFavoriteGroupHeaderDropTarget(groupRow, pointerY)
        if (groupHeaderTarget) return groupHeaderTarget
    }

    const favoriteRow = snapshot.favoriteRows.find(
        (row) => row.id !== activeId && pointerY >= row.top && pointerY <= row.bottom
    )
    if (favoriteRow) {
        return {
            overId: favoriteRow.id,
            placement: pointerY > favoriteRow.top + favoriteRow.height / 2 ? "after" : "before",
            scope: favoriteRow.isTopLevel ? "top-level" : "container",
        }
    }

    const container = snapshot.containers.find(
        (row) => pointerY >= row.top && pointerY <= row.bottom
    )
    if (container) {
        return { overId: container.containerId, scope: "container" }
    }

    return getNearestTopLevelDropTargetFromRows(snapshot.topLevelRows, activeId, pointerY)
}

function getGroupDropTargetFromSnapshot(
    snapshot: FavoriteDragLayoutSnapshot,
    activeTopLevelId: string,
    pointerY: number
): FavoriteDropTarget | null {
    const targetRow = snapshot.topLevelRows.find(
        (row) => row.id !== activeTopLevelId && pointerY >= row.top && pointerY <= row.bottom
    )
    if (targetRow) {
        const placement = getFavoriteGroupPlacementForRect(targetRow, pointerY)
        return {
            overId: targetRow.id,
            placement,
            scope: "top-level",
        }
    }

    return getNearestTopLevelDropTargetFromRows(snapshot.topLevelRows, activeTopLevelId, pointerY)
}

function getToastGroupName(groupName: string): string {
    return groupName.replace(/[.!?]+$/u, "").trim() || groupName
}

function getFavoriteMoveToastMessage({
    previousGroupName,
    nextGroupName,
}: {
    previousGroupName: string | null
    nextGroupName: string | null
}): string {
    if (previousGroupName && nextGroupName) return `Moved to ${getToastGroupName(nextGroupName)}`
    if (nextGroupName) return `Added to ${getToastGroupName(nextGroupName)}`
    if (previousGroupName) return `Removed from ${getToastGroupName(previousGroupName)}`
    return "Favorite moved"
}

function FavoriteIcon({
    favorite,
    conversation,
}: {
    favorite: FavoriteItem
    conversation?: Conversation
}) {
    if (favorite.entityType === "member") {
        const image = typeof favorite.meta?.image === "string" ? favorite.meta.image : null
        const name =
            typeof favorite.meta?.name === "string" && favorite.meta.name.trim()
                ? favorite.meta.name
                : favorite.label

        return (
            <span className="relative shrink-0">
                {image ? (
                    <img
                        src={image}
                        alt=""
                        className="size-4 rounded-full object-cover"
                        draggable={false}
                    />
                ) : (
                    <GeneratedAvatar alt="" fallbackText={name} size="xxs" className="size-4" />
                )}
                <PresenceIndicator
                    userId={favorite.entityId}
                    size="sm"
                    className="absolute -right-0.5 -bottom-0.5"
                    showOffline
                />
            </span>
        )
    }

    if (favorite.entityType === "conversation") {
        const conversationType = getFavoriteConversationType(favorite, conversation)

        if (conversationType === "team") return <MessagesSquare className="size-4" />

        return <MessageSquare className="size-4" />
    }

    if (favorite.entityType === "assistant_conversation") return <Bot className="size-4" />
    if (favorite.entityType === "invoice") return <ReceiptText className="size-4" />
    if (favorite.entityType === "quote") return <FileText className="size-4" />
    return <Star className="size-4" />
}

function FavoriteDropContainer({
    children,
    isOpen = true,
    className,
    containerId,
}: {
    children: ReactNode
    isOpen?: boolean
    className?: string
    containerId: string
}) {
    return (
        <li
            role="presentation"
            data-favorite-container-id={containerId}
            className={cn(
                "grid min-h-0 rounded-md transition-[grid-template-rows,opacity,background-color] duration-150",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                !isOpen && "pointer-events-none"
            )}
            style={{ transitionTimingFunction: favoritesSectionAnimationCurve }}
        >
            <div className="min-h-0 overflow-hidden">
                <ul className={cn("flex w-full min-w-0 flex-col gap-1", className)}>{children}</ul>
            </div>
        </li>
    )
}

function FavoriteAnimatedMenuItem({ className, ...props }: ComponentPropsWithRef<"li">) {
    return (
        <li
            data-slot="sidebar-menu-item"
            data-sidebar="menu-item"
            className={cn("group/menu-item relative", className)}
            {...props}
        />
    )
}

function FavoriteGroupRow({
    group,
    organizationId,
    isOpen,
    isRenaming,
    onOpenChange,
    onStartRename,
    onRename,
    onDelete,
    isDragging,
    onDragPointerDown,
}: {
    group: FavoriteGroup
    organizationId: string
    isOpen: boolean
    isRenaming: boolean
    onOpenChange: (open: boolean) => void
    onStartRename: () => void
    onRename: (name: string) => void
    onDelete: () => void
    isDragging: boolean
    onDragPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
}) {
    const { t } = useTranslation("workspace")
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [name, setName] = useState(group.name)
    const sortableId = getFavoriteGroupTopLevelId(group.id)

    const submitRename = useCallback(() => {
        const nextName = name.trim()
        if (!nextName || nextName === group.name) {
            onRename(group.name)
            return
        }
        onRename(nextName)
    }, [group.name, name, onRename])

    if (isRenaming) {
        return (
            <SidebarMenuItem className="py-[3px]">
                <SidebarInput
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={submitRename}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") submitRename()
                        if (event.key === "Escape") onRename(group.name)
                    }}
                    className="mx-[3px] h-8 w-[calc(100%-6px)] rounded-md border-ds-sidebar-ring bg-ds-sidebar-surface px-2 text-ds-sidebar-text focus-visible:ring-2 focus-visible:ring-ds-gray-alpha-300"
                />
            </SidebarMenuItem>
        )
    }

    return (
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <FavoriteAnimatedMenuItem
                data-favorite-layout-id={`group:${group.id}`}
                data-favorite-is-dragging={isDragging ? "true" : undefined}
                data-favorite-group-row-id={group.id}
                data-favorite-top-level-id={sortableId}
                onContextMenu={(event) => {
                    event.preventDefault()
                    setIsMenuOpen(true)
                }}
                className={cn(
                    "transition-[opacity,transform] duration-150",
                    isDragging && "pointer-events-none opacity-0 transition-none"
                )}
            >
                <SidebarMenuButton
                    type="button"
                    className={cn(
                        "cursor-grab pr-14 transition-[opacity,transform] duration-150 active:cursor-grabbing group-focus-within/menu-item:bg-ds-sidebar-surface-hover group-focus-within/menu-item:text-ds-sidebar-text group-hover/menu-item:bg-ds-sidebar-surface-hover group-hover/menu-item:text-ds-sidebar-text"
                    )}
                    onPointerDown={onDragPointerDown}
                    onClick={() => onOpenChange(!isOpen)}
                    data-favorite-group-id={group.id}
                    data-organization-id={organizationId}
                >
                    {isOpen ? <FolderOpen className="size-4" /> : <Folder className="size-4" />}
                    <span className="block min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {group.name}
                    </span>
                </SidebarMenuButton>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction
                        type="button"
                        aria-label={t("sidebar.favoriteGroupMenu", {
                            defaultValue: "Favorite group menu",
                        })}
                        className={cn(
                            "!top-1/2 !right-8 !size-6 !w-6 !-translate-y-1/2 rounded-sm text-ds-sidebar-text-muted hover:bg-ds-sidebar-surface-active hover:text-ds-sidebar-text [&>svg]:size-4",
                            isDragging && "opacity-0"
                        )}
                        data-favorite-drag-disabled
                        showOnHover
                    >
                        <MoreHorizontal className="size-4" />
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
                <span
                    className={cn(
                        "pointer-events-none absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-content-center text-ds-sidebar-text-muted",
                        isDragging && "opacity-0"
                    )}
                >
                    <ChevronRight
                        className={cn("size-4 transition-transform", isOpen && "rotate-90")}
                    />
                </span>
            </FavoriteAnimatedMenuItem>
            <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem size="xs" onClick={onStartRename}>
                    <Pencil className="size-4" />
                    {t("sidebar.renameFavoriteGroup", { defaultValue: "Rename" })}
                </DropdownMenuItem>
                <DropdownMenuItem size="xs" onClick={onDelete}>
                    <Minus className="size-4" />
                    {t("sidebar.removeFavoriteGroup", { defaultValue: "Remove group" })}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function DraggableFavoriteRow({
    favorite,
    render,
    groups,
    isDragging,
    isNested = false,
    onCopyLink,
    isClickSuppressed,
    isTopLevel = false,
    onMove,
    onNewGroupForFavorite,
    onRemove,
    onNavigationIntent,
    onDragPointerDown,
}: {
    favorite: FavoriteItem
    render: RenderFavoriteOptions
    groups: FavoriteGroup[]
    isDragging: boolean
    isNested?: boolean
    isTopLevel?: boolean
    onCopyLink: (href: string) => void
    isClickSuppressed: () => boolean
    onMove: (favorite: FavoriteItem, groupId: string | null) => void
    onNewGroupForFavorite: (favorite: FavoriteItem) => void
    onRemove: (favorite: FavoriteItem) => void
    onNavigationIntent: (href: string, intent: "click" | "focus" | "hover", label: string) => void
    onDragPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
}) {
    const { t } = useTranslation("workspace")
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const sortableId = getFavoriteSortableId(favorite)

    return (
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <FavoriteAnimatedMenuItem
                data-favorite-sortable-id={sortableId}
                data-favorite-layout-id={sortableId}
                data-favorite-is-dragging={isDragging ? "true" : undefined}
                data-favorite-top-level-id={isTopLevel ? sortableId : undefined}
                onContextMenu={(event) => {
                    event.preventDefault()
                    setIsMenuOpen(true)
                }}
                className={cn(
                    "transition-[opacity,transform] duration-150",
                    isDragging && "pointer-events-none opacity-0 transition-none"
                )}
            >
                <SidebarMenuButton
                    asChild
                    className={cn(
                        "cursor-grab active:cursor-grabbing group-focus-within/menu-item:bg-ds-sidebar-surface-hover group-focus-within/menu-item:text-ds-sidebar-text group-hover/menu-item:bg-ds-sidebar-surface-hover group-hover/menu-item:text-ds-sidebar-text",
                        isNested && "pl-8"
                    )}
                >
                    <Link
                        to={render.href}
                        title={render.label}
                        draggable={false}
                        onPointerDown={onDragPointerDown}
                        onClick={(event) => {
                            if (isClickSuppressed()) {
                                event.preventDefault()
                                return
                            }
                            if (favorite.entityType === "assistant_conversation") {
                                requestQuestAssistantConversationOpen(favorite.entityId)
                            }
                            onNavigationIntent(render.href, "click", render.label)
                        }}
                        onFocus={() => onNavigationIntent(render.href, "focus", render.label)}
                        onPointerEnter={() =>
                            onNavigationIntent(render.href, "hover", render.label)
                        }
                    >
                        <FavoriteIcon favorite={favorite} conversation={render.conversation} />
                        <span className="block min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                            {render.label}
                        </span>
                    </Link>
                </SidebarMenuButton>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuAction
                        type="button"
                        aria-label={t("sidebar.favoriteMenu", {
                            defaultValue: "Favorite menu",
                        })}
                        className="!top-1/2 !right-2 !size-6 !w-6 !-translate-y-1/2 rounded-sm text-ds-sidebar-text-muted hover:bg-ds-sidebar-surface-active hover:text-ds-sidebar-text [&>svg]:size-4"
                        data-favorite-drag-disabled
                        showOnHover
                    >
                        <MoreHorizontal className="size-4" />
                    </SidebarMenuAction>
                </DropdownMenuTrigger>
            </FavoriteAnimatedMenuItem>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem size="xs" onClick={() => onCopyLink(render.href)}>
                    <Copy className="size-4" />
                    {t("sidebar.copyFavoriteLink", { defaultValue: "Copy link" })}
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger size="xs">
                        <Folder className="size-4" />
                        {t("sidebar.moveFavoriteTo", { defaultValue: "Move to" })}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem size="xs" onClick={() => onMove(favorite, null)}>
                            <SquareDashed className="size-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                                {t("sidebar.noFavoriteGroup", { defaultValue: "No group" })}
                            </span>
                            {favorite.groupId == null && <Check className="ml-auto size-4" />}
                        </DropdownMenuItem>
                        {groups.map((group) => (
                            <DropdownMenuItem
                                key={group.id}
                                size="xs"
                                onClick={() => onMove(favorite, group.id)}
                            >
                                <Folder className="size-4" />
                                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                                {favorite.groupId === group.id && (
                                    <Check className="ml-auto size-4" />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                            size="xs"
                            onClick={() => {
                                setIsMenuOpen(false)
                                window.setTimeout(() => onNewGroupForFavorite(favorite), 0)
                            }}
                        >
                            <FolderPlus className="size-4" />
                            {t("sidebar.newFavoriteGroup", { defaultValue: "New group..." })}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem size="xs" onClick={() => onRemove(favorite)}>
                    <Minus className="size-4" />
                    {t("sidebar.removeFavorite", { defaultValue: "Remove favorite" })}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function FavoriteDragPreview({
    dragVisual,
    renderFavoriteById,
    groups,
}: {
    dragVisual: FavoriteDragVisualState | null
    renderFavoriteById: Map<string, RenderFavoriteOptions>
    groups: FavoriteGroup[]
}) {
    if (!dragVisual || typeof document === "undefined") return null

    const favoriteRender = renderFavoriteById.get(dragVisual.id)
    const groupId = dragVisual.id.startsWith("group:") ? dragVisual.id.replace("group:", "") : null
    const group = groupId ? groups.find((candidate) => candidate.id === groupId) : null

    if (!favoriteRender && !group) return null

    return createPortal(
        <div
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 z-[80] flex items-center gap-2 overflow-hidden rounded-md px-2 font-medium text-ds-sidebar-text-muted text-xs leading-none opacity-75 will-change-transform [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0"
            style={getFavoriteDragPreviewStyle(dragVisual)}
        >
            {favoriteRender ? (
                <>
                    <FavoriteIcon
                        favorite={favoriteRender.favorite}
                        conversation={favoriteRender.conversation}
                    />
                    <span className="block min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {favoriteRender.label}
                    </span>
                </>
            ) : (
                <>
                    <Folder className="size-4" />
                    <span className="block min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {group?.name}
                    </span>
                </>
            )}
        </div>,
        document.body
    )
}

export function OrgSidebarFavoritesSection({
    organizationId,
    organizationName,
    currentUserId,
    slug,
    onNavigationIntent,
}: OrgSidebarFavoritesSectionProps) {
    const { t } = useTranslation("workspace")
    const currentLocation = useLocation({
        select: (location) => ({
            pathname: location.pathname,
            search: location.searchStr,
            hash: location.hash,
        }),
    })
    const preferenceId = getOrgFavoritesSectionPreferenceId(organizationId)
    const [isOpen, setIsOpen] = useState(() => readSidebarSectionPreference(preferenceId))
    const [isCreatingGroup, setIsCreatingGroup] = useState(false)
    const [draftGroupName, setDraftGroupName] = useState("")
    const [favoritePendingGroupCreation, setFavoritePendingGroupCreation] =
        useState<FavoriteItem | null>(null)
    const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
    const [draggingFavoriteId, setDraggingFavoriteId] = useState<string | null>(null)
    const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
    const [dragVisual, setDragVisual] = useState<FavoriteDragVisualState | null>(null)
    const [previewFavoriteContainers, setPreviewFavoriteContainers] = useState<
        FavoriteContainer[] | null
    >(null)
    const [previewFavoriteGroups, setPreviewFavoriteGroups] = useState<FavoriteGroup[] | null>(null)
    const groupCreationInputRef = useRef<HTMLInputElement>(null)
    const dragSessionRef = useRef<FavoriteDragSession | null>(null)
    const draggingFavoriteIdRef = useRef<string | null>(null)
    const draggingGroupIdRef = useRef<string | null>(null)
    const lastFavoriteDropTargetRef = useRef<FavoriteDropTarget | null>(null)
    const lastGroupDropTargetRef = useRef<FavoriteDropTarget | null>(null)
    const suppressNextFavoriteClickRef = useRef(false)
    const visibleFavoriteContainersRef = useRef<FavoriteContainer[]>([])
    const favoriteContainersRef = useRef<FavoriteContainer[]>([])
    const favoriteGroupsRef = useRef<FavoriteGroup[]>([])
    const visibleFavoriteGroupsRef = useRef<FavoriteGroup[]>([])
    const favoriteBySortableIdRef = useRef<Map<string, FavoriteItem>>(new Map())
    const previewFavoriteContainersRef = useRef<FavoriteContainer[] | null>(null)
    const previewFavoriteGroupsRef = useRef<FavoriteGroup[] | null>(null)
    const layoutAnimationSnapshotRef = useRef<FavoriteLayoutAnimationSnapshot | null>(null)
    const layoutAnimationCleanupRef = useRef<number | null>(null)
    const favoritesQuery = useFavorites(organizationId)
    const favoriteToggleMutation = useFavoriteToggle()
    const createGroupMutation = useCreateFavoriteGroup()
    const renameGroupMutation = useRenameFavoriteGroup()
    const deleteGroupMutation = useDeleteFavoriteGroup()
    const reorderFavoritesMutation = useReorderFavorites()
    const displayFavorites = favoritesQuery.data?.favorites ?? []
    const favoriteGroups = favoritesQuery.data?.groups ?? []
    const conversationsQuery = useQuery({
        ...orgSidebarMemberConversationsQueryOptions({
            userId: currentUserId,
            organizationId,
        }),
        enabled: Boolean(currentUserId && organizationId),
    })
    const conversationById = useMemo(
        () =>
            new Map(
                (conversationsQuery.data?.conversations ?? []).map((conversation) => [
                    conversation.id,
                    conversation,
                ])
            ),
        [conversationsQuery.data?.conversations]
    )
    const favoriteContainers = useMemo(
        () => buildFavoriteContainers(displayFavorites, favoriteGroups),
        [displayFavorites, favoriteGroups]
    )
    const visibleFavoriteGroups = previewFavoriteGroups ?? favoriteGroups
    const visibleFavoriteContainers = previewFavoriteContainers ?? favoriteContainers
    const visibleRootFavorites = visibleFavoriteContainers[0]?.favorites ?? []
    const visibleTopLevelEntries = useMemo(
        () => buildFavoriteTopLevelEntries(visibleRootFavorites, visibleFavoriteGroups),
        [visibleRootFavorites, visibleFavoriteGroups]
    )
    const favoriteBySortableId = useMemo(
        () =>
            new Map<string, FavoriteItem>(
                displayFavorites.map((favorite) => [getFavoriteSortableId(favorite), favorite])
            ),
        [displayFavorites]
    )
    const renderFavoriteById = useMemo(() => {
        return new Map<string, RenderFavoriteOptions>(
            displayFavorites.map((favorite) => {
                const href = getFavoriteHref(favorite, slug, currentLocation)
                const conversation =
                    favorite.entityType === "conversation"
                        ? conversationById.get(favorite.entityId)
                        : undefined
                const label = getFavoriteDisplayLabel({
                    favorite,
                    conversation,
                    organizationName,
                    t,
                })

                return [
                    getFavoriteSortableId(favorite),
                    {
                        favorite,
                        href,
                        label,
                        conversation,
                    },
                ]
            })
        )
    }, [conversationById, currentLocation, displayFavorites, organizationName, slug, t])

    const captureNextFavoriteLayoutAnimation = useCallback(
        (options: FavoriteLayoutAnimationOptions = {}) => {
            if (layoutAnimationCleanupRef.current !== null) {
                window.clearTimeout(layoutAnimationCleanupRef.current)
                layoutAnimationCleanupRef.current = null
            }

            clearFavoriteLayoutAnimationStyles()
            layoutAnimationSnapshotRef.current = captureFavoriteLayoutAnimationSnapshot(options)
        },
        []
    )

    const setPreviewContainers = useCallback(
        (
            containers: FavoriteContainer[] | null,
            animationOptions?: FavoriteLayoutAnimationOptions
        ) => {
            captureNextFavoriteLayoutAnimation(animationOptions)
            previewFavoriteContainersRef.current = containers
            visibleFavoriteContainersRef.current = containers ?? favoriteContainersRef.current
            setPreviewFavoriteContainers(containers)
        },
        [captureNextFavoriteLayoutAnimation]
    )

    const setPreviewGroups = useCallback(
        (groups: FavoriteGroup[] | null, animationOptions?: FavoriteLayoutAnimationOptions) => {
            captureNextFavoriteLayoutAnimation(animationOptions)
            previewFavoriteGroupsRef.current = groups
            visibleFavoriteGroupsRef.current = groups ?? favoriteGroupsRef.current
            setPreviewFavoriteGroups(groups)
        },
        [captureNextFavoriteLayoutAnimation]
    )

    const setPreviewTopLevelOrder = useCallback(
        (
            {
                containers,
                groups,
            }: {
                containers: FavoriteContainer[] | null
                groups: FavoriteGroup[] | null
            },
            animationOptions?: FavoriteLayoutAnimationOptions
        ) => {
            setPreviewContainers(containers, animationOptions)
            setPreviewGroups(groups, animationOptions)
        },
        [setPreviewContainers, setPreviewGroups]
    )

    useEffect(() => {
        visibleFavoriteContainersRef.current = visibleFavoriteContainers
        favoriteContainersRef.current = favoriteContainers
        favoriteGroupsRef.current = favoriteGroups
        visibleFavoriteGroupsRef.current = visibleFavoriteGroups
        favoriteBySortableIdRef.current = favoriteBySortableId
        previewFavoriteContainersRef.current = previewFavoriteContainers
        previewFavoriteGroupsRef.current = previewFavoriteGroups
    }, [
        favoriteBySortableId,
        favoriteContainers,
        favoriteGroups,
        previewFavoriteContainers,
        previewFavoriteGroups,
        visibleFavoriteContainers,
        visibleFavoriteGroups,
    ])

    useBrowserLayoutEffect(() => {
        const snapshot = layoutAnimationSnapshotRef.current
        if (!snapshot) return

        layoutAnimationSnapshotRef.current = null
        if (!playFavoriteLayoutAnimation(snapshot)) return

        layoutAnimationCleanupRef.current = window.setTimeout(() => {
            layoutAnimationCleanupRef.current = null
            clearFavoriteLayoutAnimationStyles()
        }, favoriteLayoutAnimationDurationMs + 40)
    }, [visibleFavoriteContainers, visibleFavoriteGroups])

    useEffect(() => {
        return () => {
            if (layoutAnimationCleanupRef.current !== null) {
                window.clearTimeout(layoutAnimationCleanupRef.current)
            }
            clearFavoriteLayoutAnimationStyles()
        }
    }, [])

    useEffect(() => {
        if (!isCreatingGroup) return

        const focusInput = () => {
            groupCreationInputRef.current?.focus()
        }
        const timeoutIds = [0, 50, 150, 300].map((delay) => window.setTimeout(focusInput, delay))
        const animationFrameId = window.requestAnimationFrame(focusInput)

        return () => {
            for (const timeoutId of timeoutIds) {
                window.clearTimeout(timeoutId)
            }
            window.cancelAnimationFrame(animationFrameId)
        }
    }, [isCreatingGroup])

    const handleOpenChange = useCallback(
        (open: boolean) => {
            setIsOpen(open)
            writeSidebarSectionPreference(preferenceId, open)
        },
        [preferenceId]
    )

    const commitFavoriteContainers = useCallback(
        (containers: FavoriteContainer[]) => {
            setPreviewContainers(containers)
            const items = buildFavoriteTopLevelPlacementUpdates(containers)
            reorderFavoritesMutation.mutate(
                { organizationId, items },
                { onSettled: () => setPreviewContainers(null) }
            )
        },
        [organizationId, reorderFavoritesMutation, setPreviewContainers]
    )

    const commitFavoriteTopLevelOrder = useCallback(
        ({ containers, groups }: { containers: FavoriteContainer[]; groups: FavoriteGroup[] }) => {
            setPreviewTopLevelOrder({ containers, groups })
            reorderFavoritesMutation.mutate(
                {
                    organizationId,
                    items: buildFavoriteTopLevelPlacementUpdates(containers),
                    groups: buildFavoriteTopLevelGroupPositionUpdates(groups),
                },
                {
                    onSettled: () => {
                        setPreviewTopLevelOrder({ containers: null, groups: null })
                    },
                }
            )
        },
        [organizationId, reorderFavoritesMutation, setPreviewTopLevelOrder]
    )

    const getFavoriteGroupName = useCallback(
        (groupId: string | null) =>
            groupId
                ? (favoriteGroups.find((group) => group.id === groupId)?.name ?? "group")
                : null,
        [favoriteGroups]
    )

    const commitFavoriteMove = useCallback(
        ({
            favorite,
            previousContainers,
            nextContainers,
            previousGroupId,
            nextGroupId,
            nextGroupName,
        }: {
            favorite: FavoriteItem
            previousContainers: FavoriteContainer[]
            nextContainers: FavoriteContainer[]
            previousGroupId: string | null
            nextGroupId: string | null
            nextGroupName?: string
        }) => {
            commitFavoriteContainers(nextContainers)
            if (previousGroupId === nextGroupId) return

            showUndoToast(
                getFavoriteMoveToastMessage({
                    previousGroupName: getFavoriteGroupName(previousGroupId),
                    nextGroupName: nextGroupName ?? getFavoriteGroupName(nextGroupId),
                }),
                {
                    onUndo: () => commitFavoriteContainers(previousContainers),
                },
                { id: `favorite-move:${favorite.entityType}:${favorite.entityId}` }
            )
        },
        [commitFavoriteContainers, getFavoriteGroupName]
    )

    const commitFavoriteTopLevelMove = useCallback(
        ({
            favorite,
            previousContainers,
            previousGroups,
            nextOrder,
            previousGroupId,
            nextGroupId,
        }: {
            favorite: FavoriteItem
            previousContainers: FavoriteContainer[]
            previousGroups: FavoriteGroup[]
            nextOrder: { containers: FavoriteContainer[]; groups: FavoriteGroup[] }
            previousGroupId: string | null
            nextGroupId: string | null
        }) => {
            commitFavoriteTopLevelOrder(nextOrder)
            if (previousGroupId === nextGroupId) return

            showUndoToast(
                getFavoriteMoveToastMessage({
                    previousGroupName: getFavoriteGroupName(previousGroupId),
                    nextGroupName: getFavoriteGroupName(nextGroupId),
                }),
                {
                    onUndo: () =>
                        commitFavoriteTopLevelOrder({
                            containers: previousContainers,
                            groups: previousGroups,
                        }),
                },
                { id: `favorite-move:${favorite.entityType}:${favorite.entityId}` }
            )
        },
        [commitFavoriteTopLevelOrder, getFavoriteGroupName]
    )

    const previewFavoriteMove = useCallback(
        (target: FavoriteDropTarget) => {
            const activeId = draggingFavoriteIdRef.current
            if (!activeId) return

            const activeFavorite = favoriteBySortableIdRef.current.get(activeId)
            if (!activeFavorite) return

            if (target.scope === "top-level") {
                const nextOrder = moveFavoriteToTopLevel({
                    containers: visibleFavoriteContainersRef.current,
                    groups: visibleFavoriteGroupsRef.current,
                    activeFavorite,
                    activeId,
                    overTopLevelId: target.overId,
                    placement: target.placement,
                })
                if (
                    nextOrder &&
                    (getFavoriteContainersSignature(nextOrder.containers) !==
                        getFavoriteContainersSignature(visibleFavoriteContainersRef.current) ||
                        getFavoriteGroupsSignature(nextOrder.groups) !==
                            getFavoriteGroupsSignature(visibleFavoriteGroupsRef.current))
                ) {
                    setPreviewTopLevelOrder({
                        containers: nextOrder.containers,
                        groups: nextOrder.groups,
                    })
                }
                return
            }

            const nextContainers = moveFavoriteInContainers({
                containers: visibleFavoriteContainersRef.current,
                activeFavorite,
                activeId,
                overId: target.overId,
                placement: target.placement,
            })
            if (
                nextContainers &&
                getFavoriteContainersSignature(nextContainers) !==
                    getFavoriteContainersSignature(visibleFavoriteContainersRef.current)
            ) {
                setPreviewContainers(nextContainers)
            }
        },
        [setPreviewContainers, setPreviewTopLevelOrder]
    )

    const handleDropFavorite = useCallback(
        (target: FavoriteDropTarget) => {
            const activeId = draggingFavoriteIdRef.current
            draggingFavoriteIdRef.current = null
            lastFavoriteDropTargetRef.current = null
            setDraggingFavoriteId(null)
            if (!activeId) {
                setPreviewContainers(null)
                return
            }

            const activeFavorite = favoriteBySortableIdRef.current.get(activeId)
            if (!activeFavorite) {
                setPreviewContainers(null)
                return
            }

            const sourceContainerId = getContainerIdForFavorite(
                favoriteContainersRef.current,
                activeId
            )
            if (target.scope === "top-level") {
                const nextOrder = moveFavoriteToTopLevel({
                    containers: favoriteContainersRef.current,
                    groups: favoriteGroupsRef.current,
                    activeFavorite,
                    activeId,
                    overTopLevelId: target.overId,
                    placement: target.placement,
                })
                if (!sourceContainerId || !nextOrder) {
                    setPreviewTopLevelOrder({ containers: null, groups: null })
                    return
                }

                commitFavoriteTopLevelMove({
                    favorite: activeFavorite,
                    previousContainers: favoriteContainersRef.current,
                    previousGroups: favoriteGroupsRef.current,
                    nextOrder,
                    previousGroupId: getContainerGroupId(sourceContainerId),
                    nextGroupId: null,
                })
                return
            }

            const nextContainers = moveFavoriteInContainers({
                containers: favoriteContainersRef.current,
                activeFavorite,
                activeId,
                overId: target.overId,
                placement: target.placement,
            })
            if (!sourceContainerId || !nextContainers) {
                setPreviewContainers(null)
                return
            }

            const targetContainerId = getContainerIdForFavorite(nextContainers, activeId)
            if (!targetContainerId) {
                setPreviewContainers(null)
                return
            }

            commitFavoriteMove({
                favorite: activeFavorite,
                previousContainers: favoriteContainersRef.current,
                nextContainers,
                previousGroupId: getContainerGroupId(sourceContainerId),
                nextGroupId: getContainerGroupId(targetContainerId),
            })
        },
        [
            commitFavoriteMove,
            commitFavoriteTopLevelMove,
            setPreviewContainers,
            setPreviewTopLevelOrder,
        ]
    )

    const previewGroupMove = useCallback(
        (overTopLevelId: string, placement: FavoriteDropPlacement = "before") => {
            const activeGroupId = draggingGroupIdRef.current
            if (!activeGroupId) return

            const nextOrder = moveFavoriteTopLevelGroup({
                containers: visibleFavoriteContainersRef.current,
                groups: visibleFavoriteGroupsRef.current,
                activeGroupId,
                overTopLevelId,
                placement,
            })
            if (
                nextOrder &&
                (getFavoriteContainersSignature(nextOrder.containers) !==
                    getFavoriteContainersSignature(visibleFavoriteContainersRef.current) ||
                    getFavoriteGroupsSignature(nextOrder.groups) !==
                        getFavoriteGroupsSignature(visibleFavoriteGroupsRef.current))
            ) {
                setPreviewTopLevelOrder({
                    containers: nextOrder.containers,
                    groups: nextOrder.groups,
                })
            }
        },
        [setPreviewTopLevelOrder]
    )

    const handleDropGroup = useCallback(
        (overTopLevelId: string, placement: FavoriteDropPlacement = "before") => {
            const activeGroupId = draggingGroupIdRef.current
            draggingGroupIdRef.current = null
            lastGroupDropTargetRef.current = null
            setDraggingGroupId(null)
            if (!activeGroupId) {
                setPreviewTopLevelOrder({ containers: null, groups: null })
                return
            }

            const nextOrder = moveFavoriteTopLevelGroup({
                containers: favoriteContainersRef.current,
                groups: favoriteGroupsRef.current,
                activeGroupId,
                overTopLevelId,
                placement,
            })
            if (!nextOrder) {
                setPreviewTopLevelOrder({ containers: null, groups: null })
                return
            }

            commitFavoriteTopLevelOrder(nextOrder)
        },
        [commitFavoriteTopLevelOrder, setPreviewTopLevelOrder]
    )

    const resetDragState = useCallback(
        (animationOptions?: FavoriteLayoutAnimationOptions) => {
            dragSessionRef.current = null
            draggingFavoriteIdRef.current = null
            draggingGroupIdRef.current = null
            lastFavoriteDropTargetRef.current = null
            lastGroupDropTargetRef.current = null
            clearFavoriteDragVisualPosition()
            setDraggingFavoriteId(null)
            setDraggingGroupId(null)
            setDragVisual(null)
            setPreviewTopLevelOrder({ containers: null, groups: null }, animationOptions)
        },
        [setPreviewTopLevelOrder]
    )

    const cancelDrag = useCallback(() => {
        const session = dragSessionRef.current
        if (!session) return false

        if (!session.isActive) {
            dragSessionRef.current = null
            return false
        }

        resetDragState({ includeDragging: true })
        return true
    }, [resetDragState])

    const startFavoriteDragPointer = useCallback(
        (favorite: FavoriteItem, event: ReactPointerEvent<HTMLElement>) => {
            if (
                event.button !== 0 ||
                event.defaultPrevented ||
                event.currentTarget.closest("[data-favorite-drag-disabled]")
            ) {
                return
            }

            dragSessionRef.current = {
                kind: "favorite",
                id: getFavoriteSortableId(favorite),
                startX: event.clientX,
                startY: event.clientY,
                isActive: false,
                layout: null,
                visual: captureFavoriteDragVisualSnapshot(event.currentTarget),
            }
            lastFavoriteDropTargetRef.current = null
            lastGroupDropTargetRef.current = null
        },
        []
    )

    const startGroupDragPointer = useCallback(
        (group: FavoriteGroup, event: ReactPointerEvent<HTMLElement>) => {
            if (
                event.button !== 0 ||
                event.defaultPrevented ||
                event.currentTarget.closest("[data-favorite-drag-disabled]")
            ) {
                return
            }

            dragSessionRef.current = {
                kind: "group",
                id: group.id,
                startX: event.clientX,
                startY: event.clientY,
                isActive: false,
                layout: null,
                visual: captureFavoriteDragVisualSnapshot(event.currentTarget),
            }
            lastFavoriteDropTargetRef.current = null
            lastGroupDropTargetRef.current = null
        },
        []
    )

    const activateDragSession = useCallback((session: FavoriteDragSession, event: PointerEvent) => {
        session.isActive = true
        session.layout = captureFavoriteDragLayoutSnapshot()
        updateFavoriteDragVisualPosition(session.visual, event.clientX, event.clientY)
        suppressNextFavoriteClickRef.current = true
        window.setTimeout(() => {
            suppressNextFavoriteClickRef.current = false
        }, 0)

        if (session.kind === "favorite") {
            draggingFavoriteIdRef.current = session.id
            setDraggingFavoriteId(session.id)
            if (session.visual) {
                setDragVisual({
                    id: session.id,
                    width: session.visual.width,
                    height: session.visual.height,
                })
            }
            return
        }

        draggingGroupIdRef.current = session.id
        setDraggingGroupId(session.id)
        if (session.visual) {
            setDragVisual({
                id: getFavoriteGroupTopLevelId(session.id),
                width: session.visual.width,
                height: session.visual.height,
            })
        }
    }, [])

    const updateDragPreview = useCallback(
        (event: PointerEvent) => {
            const session = dragSessionRef.current
            if (!session) return

            if (!session.isActive) {
                const distance = Math.hypot(
                    event.clientX - session.startX,
                    event.clientY - session.startY
                )
                if (distance < favoriteDragActivationDistancePx) return
                activateDragSession(session, event)
            }

            updateFavoriteDragVisualPosition(session.visual, event.clientX, event.clientY)

            if (session.kind === "favorite") {
                if (!session.layout) return
                const target = getFavoriteDropTargetFromSnapshot(
                    session.layout,
                    session.id,
                    event.clientY
                )
                if (
                    !target ||
                    isSameFavoriteDropTarget(target, lastFavoriteDropTargetRef.current)
                ) {
                    return
                }
                lastFavoriteDropTargetRef.current = target
                previewFavoriteMove(target)
                return
            }

            if (!session.layout) return
            const target = getGroupDropTargetFromSnapshot(
                session.layout,
                getFavoriteGroupTopLevelId(session.id),
                event.clientY
            )
            if (!target || isSameFavoriteDropTarget(target, lastGroupDropTargetRef.current)) {
                return
            }
            lastGroupDropTargetRef.current = target
            previewGroupMove(target.overId, target.placement)
        },
        [activateDragSession, previewFavoriteMove, previewGroupMove]
    )

    const finishDrag = useCallback(
        (event: PointerEvent) => {
            const session = dragSessionRef.current
            if (!session) return
            if (!session.isActive) {
                dragSessionRef.current = null
                return
            }
            dragSessionRef.current = null

            if (session.kind === "favorite") {
                if (!session.layout) {
                    resetDragState()
                    return
                }
                const target = getFavoriteDropTargetFromSnapshot(
                    session.layout,
                    session.id,
                    event.clientY
                )
                if (target) {
                    if (!isSameFavoriteDropTarget(target, lastFavoriteDropTargetRef.current)) {
                        setPreviewTopLevelOrder({ containers: null, groups: null })
                    }
                    clearFavoriteDragVisualPosition()
                    setDragVisual(null)
                    handleDropFavorite(target)
                    return
                }
                resetDragState()
                return
            }

            if (!session.layout) {
                resetDragState()
                return
            }
            const target = getGroupDropTargetFromSnapshot(
                session.layout,
                getFavoriteGroupTopLevelId(session.id),
                event.clientY
            )
            if (target) {
                if (!isSameFavoriteDropTarget(target, lastGroupDropTargetRef.current)) {
                    setPreviewTopLevelOrder({ containers: null, groups: null })
                }
                clearFavoriteDragVisualPosition()
                setDragVisual(null)
                handleDropGroup(target.overId, target.placement)
                return
            }

            resetDragState()
        },
        [handleDropFavorite, handleDropGroup, resetDragState, setPreviewTopLevelOrder]
    )

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => updateDragPreview(event)
        const handlePointerEnd = (event: PointerEvent) => finishDrag(event)
        const handleKeyDown = (event: KeyboardEvent) => {
            const session = dragSessionRef.current
            if (event.key !== "Escape" || !session) return

            if (!session.isActive) {
                dragSessionRef.current = null
                return
            }

            event.preventDefault()
            cancelDrag()
        }

        window.addEventListener("pointermove", handlePointerMove, { passive: true })
        window.addEventListener("pointerup", handlePointerEnd)
        window.addEventListener("pointercancel", handlePointerEnd)
        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("pointermove", handlePointerMove)
            window.removeEventListener("pointerup", handlePointerEnd)
            window.removeEventListener("pointercancel", handlePointerEnd)
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [cancelDrag, finishDrag, updateDragPreview])

    const handleRemoveFavorite = useCallback(
        (favorite: FavoriteItem) => {
            void favoriteToggleMutation.mutateAsync({
                entityType: favorite.entityType,
                entityId: favorite.entityId,
                isFavorited: true,
                organizationId,
                optimisticFavorite: favorite,
            })
        },
        [favoriteToggleMutation, organizationId]
    )

    const handleMoveFavorite = useCallback(
        (
            favorite: FavoriteItem,
            groupId: string | null,
            containers: FavoriteContainer[] = favoriteContainers,
            groupName?: string
        ) => {
            if ((favorite.groupId ?? null) === groupId) return

            const nextContainers = containers.map((container) => ({
                ...container,
                favorites: container.favorites.filter(
                    (item) =>
                        item.entityType !== favorite.entityType ||
                        item.entityId !== favorite.entityId
                ),
            }))
            let targetContainer = nextContainers.find((container) => container.groupId === groupId)
            if (!targetContainer && groupId) {
                targetContainer = {
                    id: getFavoriteGroupContainerId(groupId),
                    groupId,
                    favorites: [],
                }
                nextContainers.push(targetContainer)
            }
            if (!targetContainer) return

            targetContainer.favorites.push({ ...favorite, groupId })
            commitFavoriteMove({
                favorite,
                previousContainers: containers,
                nextContainers,
                previousGroupId: favorite.groupId ?? null,
                nextGroupId: groupId,
                nextGroupName: groupName,
            })
        },
        [commitFavoriteMove, favoriteContainers]
    )

    const handleCopyFavoriteLink = useCallback((href: string) => {
        const absoluteHref =
            typeof window === "undefined" ? href : new URL(href, window.location.origin).toString()
        navigator.clipboard.writeText(absoluteHref).then(
            () => showSuccessToast("Link copied"),
            () => showErrorToast("Failed to copy link")
        )
    }, [])

    const submitGroupCreation = useCallback(async () => {
        const name = draftGroupName.trim()
        if (!name) {
            setIsCreatingGroup(false)
            setDraftGroupName("")
            setFavoritePendingGroupCreation(null)
            return
        }

        const favoriteToMove = favoritePendingGroupCreation
        const group = await createGroupMutation
            .mutateAsync({
                organizationId,
                name,
                showToast: favoriteToMove === null,
            })
            .catch(() => null)
        if (!group) return

        setIsCreatingGroup(false)
        setDraftGroupName("")
        setFavoritePendingGroupCreation(null)

        if (favoriteToMove) {
            handleMoveFavorite(
                favoriteToMove,
                group.id,
                [
                    ...favoriteContainers,
                    {
                        id: getFavoriteGroupContainerId(group.id),
                        groupId: group.id,
                        favorites: [],
                    },
                ],
                group.name
            )
        }
    }, [
        createGroupMutation,
        draftGroupName,
        favoriteContainers,
        favoritePendingGroupCreation,
        handleMoveFavorite,
        organizationId,
    ])

    const startGroupCreationForFavorite = useCallback(
        (favorite: FavoriteItem) => {
            setIsOpen(true)
            writeSidebarSectionPreference(preferenceId, true)
            setIsCreatingGroup(true)
            setDraftGroupName("")
            setFavoritePendingGroupCreation(favorite)
        },
        [preferenceId]
    )

    const hasContent = displayFavorites.length > 0 || favoriteGroups.length > 0

    return (
        <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
            <SidebarGroup className="px-2">
                <SidebarGroupLabel className="group/nav transition-colors hover:bg-ds-sidebar-surface-hover hover:text-ds-sidebar-text">
                    <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-1 text-left font-medium"
                        onClick={() => handleOpenChange(!isOpen)}
                    >
                        <span>{t("sidebar.favoritesSection", { defaultValue: "Favorites" })}</span>
                    </button>
                    <Tooltip delayDuration={600}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label={t("sidebar.createFavoriteGroup", {
                                    defaultValue: "Create group",
                                })}
                                className="ml-auto grid size-6 place-content-center rounded-sm text-ds-sidebar-text-muted opacity-0 transition-colors hover:bg-ds-sidebar-surface-active hover:text-ds-sidebar-text focus-visible:opacity-100 group-hover/nav:opacity-100"
                                onClick={() => {
                                    setIsOpen(true)
                                    writeSidebarSectionPreference(preferenceId, true)
                                    setFavoritePendingGroupCreation(null)
                                    setIsCreatingGroup(true)
                                }}
                            >
                                <FolderPlus className="size-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                            {t("sidebar.createFavoriteGroup", {
                                defaultValue: "Create group",
                            })}
                        </TooltipContent>
                    </Tooltip>
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            aria-label={t("sidebar.toggleFavorites", {
                                defaultValue: "Toggle favorites",
                            })}
                            className="grid size-6 place-content-center rounded-sm text-ds-sidebar-text-muted transition-colors hover:bg-ds-sidebar-surface-active hover:text-ds-sidebar-text"
                        >
                            <ChevronRight
                                className={cn(
                                    "!size-4 transition-transform duration-[140ms]",
                                    isOpen && "rotate-90"
                                )}
                                style={{
                                    transitionTimingFunction: favoritesSectionAnimationCurve,
                                }}
                            />
                        </button>
                    </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent
                    className="data-[state=closed]:[animation-duration:110ms] data-[state=open]:[animation-duration:140ms]"
                    style={{ animationTimingFunction: favoritesSectionAnimationCurve }}
                >
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {isCreatingGroup && (
                                <SidebarMenuItem className="py-[3px]">
                                    <SidebarInput
                                        autoFocus
                                        ref={groupCreationInputRef}
                                        value={draftGroupName}
                                        placeholder={t("sidebar.favoriteGroupNamePlaceholder", {
                                            defaultValue: "Group name...",
                                        })}
                                        onChange={(event) => setDraftGroupName(event.target.value)}
                                        onBlur={() => {
                                            if (draftGroupName.trim()) {
                                                void submitGroupCreation()
                                            }
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                void submitGroupCreation()
                                            }
                                            if (event.key === "Escape") {
                                                setIsCreatingGroup(false)
                                                setDraftGroupName("")
                                                setFavoritePendingGroupCreation(null)
                                            }
                                        }}
                                        className="mx-[3px] h-8 w-[calc(100%-6px)] border-ds-sidebar-ring bg-ds-sidebar-surface px-2 text-ds-sidebar-text"
                                    />
                                </SidebarMenuItem>
                            )}

                            {visibleTopLevelEntries.map((entry) => {
                                if (entry.kind === "favorite") {
                                    const favorite = entry.favorite
                                    const sortableId = getFavoriteSortableId(favorite)
                                    const render = renderFavoriteById.get(sortableId)
                                    if (!render) return null

                                    return (
                                        <DraggableFavoriteRow
                                            key={sortableId}
                                            favorite={favorite}
                                            render={render}
                                            groups={visibleFavoriteGroups}
                                            isDragging={draggingFavoriteId === sortableId}
                                            isTopLevel
                                            isClickSuppressed={() =>
                                                suppressNextFavoriteClickRef.current
                                            }
                                            onCopyLink={handleCopyFavoriteLink}
                                            onMove={handleMoveFavorite}
                                            onNewGroupForFavorite={startGroupCreationForFavorite}
                                            onRemove={handleRemoveFavorite}
                                            onNavigationIntent={onNavigationIntent}
                                            onDragPointerDown={(event) =>
                                                startFavoriteDragPointer(favorite, event)
                                            }
                                        />
                                    )
                                }

                                const group = entry.group
                                return (
                                    <FavoriteGroupBlock
                                        key={group.id}
                                        group={group}
                                        organizationId={organizationId}
                                        isRenaming={renamingGroupId === group.id}
                                        container={
                                            visibleFavoriteContainers.find(
                                                (container) => container.groupId === group.id
                                            ) ?? {
                                                id: getFavoriteGroupContainerId(group.id),
                                                groupId: group.id,
                                                favorites: [],
                                            }
                                        }
                                        renderFavoriteById={renderFavoriteById}
                                        groups={visibleFavoriteGroups}
                                        draggingFavoriteId={draggingFavoriteId}
                                        draggingGroupId={draggingGroupId}
                                        isClickSuppressed={() =>
                                            suppressNextFavoriteClickRef.current
                                        }
                                        onCopyLink={handleCopyFavoriteLink}
                                        onMove={handleMoveFavorite}
                                        onNewGroupForFavorite={startGroupCreationForFavorite}
                                        onRemove={handleRemoveFavorite}
                                        onRename={(name) => {
                                            setRenamingGroupId(null)
                                            if (name !== group.name) {
                                                renameGroupMutation.mutate({
                                                    organizationId,
                                                    groupId: group.id,
                                                    name,
                                                })
                                            }
                                        }}
                                        onStartRename={() => setRenamingGroupId(group.id)}
                                        onDelete={() =>
                                            deleteGroupMutation.mutate({
                                                organizationId,
                                                groupId: group.id,
                                            })
                                        }
                                        onNavigationIntent={onNavigationIntent}
                                        onGroupDragPointerDown={(event) =>
                                            startGroupDragPointer(group, event)
                                        }
                                        onFavoriteDragPointerDown={startFavoriteDragPointer}
                                    />
                                )
                            })}

                            {!hasContent && !isCreatingGroup && (
                                <li className="px-2 py-1.5 text-ds-sidebar-text-muted text-xs">
                                    {t("sidebar.noFavorites", {
                                        defaultValue: "No items",
                                    })}
                                </li>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
            <FavoriteDragPreview
                dragVisual={dragVisual}
                renderFavoriteById={renderFavoriteById}
                groups={visibleFavoriteGroups}
            />
        </Collapsible>
    )
}

function FavoriteGroupBlock({
    group,
    organizationId,
    isRenaming,
    container,
    renderFavoriteById,
    groups,
    draggingFavoriteId,
    draggingGroupId,
    isClickSuppressed,
    onCopyLink,
    onMove,
    onNewGroupForFavorite,
    onRemove,
    onRename,
    onStartRename,
    onDelete,
    onNavigationIntent,
    onGroupDragPointerDown,
    onFavoriteDragPointerDown,
}: {
    group: FavoriteGroup
    organizationId: string
    isRenaming: boolean
    container: FavoriteContainer
    renderFavoriteById: Map<string, RenderFavoriteOptions>
    groups: FavoriteGroup[]
    draggingFavoriteId: string | null
    draggingGroupId: string | null
    isClickSuppressed: () => boolean
    onCopyLink: (href: string) => void
    onMove: (favorite: FavoriteItem, groupId: string | null) => void
    onNewGroupForFavorite: (favorite: FavoriteItem) => void
    onRemove: (favorite: FavoriteItem) => void
    onRename: (name: string) => void
    onStartRename: () => void
    onDelete: () => void
    onNavigationIntent: (href: string, intent: "click" | "focus" | "hover", label: string) => void
    onGroupDragPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
    onFavoriteDragPointerDown: (
        favorite: FavoriteItem,
        event: ReactPointerEvent<HTMLElement>
    ) => void
}) {
    const { t } = useTranslation("workspace")
    const preferenceId = getOrgFavoriteGroupPreferenceId(organizationId, group.id)
    const [isOpen, setIsOpen] = useState(() => readSidebarSectionPreference(preferenceId))

    const handleOpenChange = useCallback(
        (open: boolean) => {
            setIsOpen(open)
            writeSidebarSectionPreference(preferenceId, open)
        },
        [preferenceId]
    )

    return (
        <>
            <FavoriteGroupRow
                group={group}
                organizationId={organizationId}
                isOpen={isOpen}
                isRenaming={isRenaming}
                onOpenChange={handleOpenChange}
                onStartRename={onStartRename}
                onRename={onRename}
                onDelete={onDelete}
                isDragging={draggingGroupId === group.id}
                onDragPointerDown={onGroupDragPointerDown}
            />
            <FavoriteDropContainer
                isOpen={isOpen && draggingGroupId !== group.id}
                containerId={container.id}
            >
                {container.favorites.length === 0 && (
                    <SidebarMenuItem className="px-8 py-1.5 text-ds-sidebar-text-muted/70 text-xs">
                        {t("sidebar.noFavoriteGroupItems", {
                            defaultValue: "No items",
                        })}
                    </SidebarMenuItem>
                )}
                {container.favorites.map((favorite) => {
                    const sortableId = getFavoriteSortableId(favorite)
                    const render = renderFavoriteById.get(sortableId)
                    if (!render) return null

                    return (
                        <DraggableFavoriteRow
                            key={sortableId}
                            favorite={favorite}
                            render={render}
                            groups={groups}
                            isDragging={draggingFavoriteId === sortableId}
                            isNested
                            isClickSuppressed={isClickSuppressed}
                            onCopyLink={onCopyLink}
                            onMove={onMove}
                            onNewGroupForFavorite={onNewGroupForFavorite}
                            onRemove={onRemove}
                            onNavigationIntent={onNavigationIntent}
                            onDragPointerDown={(event) =>
                                onFavoriteDragPointerDown(favorite, event)
                            }
                        />
                    )
                })}
            </FavoriteDropContainer>
        </>
    )
}
