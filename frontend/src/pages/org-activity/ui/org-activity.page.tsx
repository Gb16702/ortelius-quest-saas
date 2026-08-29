import { Clock } from "lucide-react"
import { parseAsBoolean, parseAsString, parseAsStringEnum, useQueryStates } from "nuqs"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Role } from "@/entities/access"
import type { DatePreset } from "@/entities/activity"
import {
    activityKeys,
    DATE_PRESET_LABELS,
    datePresetSchema,
    eventTypesSearchSchema,
    useActivityEvents,
} from "@/entities/activity"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import {
    ActivityList,
    ActivityListSkeleton,
    ActorFilter,
    EventTypeFilter,
} from "@/features/activity"
import { useMemberProfileDialog } from "@/features/members"
import { useRequestSheet } from "@/features/requests"
import {
    getQueryPrimaryDataSource,
    type PrimaryDataSource,
} from "@/shared/lib/performance/navigation-metrics"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet"
import { Skeleton } from "@/shared/ui/skeleton"
import { EventTypeFilterTrigger } from "./event-type-filter-trigger"

const DATE_PRESETS = datePresetSchema.options

type OrgActivitySessionData = SessionResponse & {
    user: NonNullable<SessionResponse["user"]>
    session: { activeOrganizationId: string }
}

interface OrgActivityPageContentProps {
    sessionData: OrgActivitySessionData
}

const activityParsers = {
    actorId: parseAsString.withDefault("").withOptions({
        shallow: true,
        clearOnDefault: true,
    }),
    datePreset: parseAsStringEnum(DATE_PRESETS)
        .withDefault("all")
        .withOptions({ shallow: true, clearOnDefault: true }),
    eventTypes: parseAsString.withDefault("").withOptions({
        shallow: true,
        clearOnDefault: true,
    }),
    filterOpen: parseAsBoolean.withDefault(false).withOptions({
        shallow: true,
        clearOnDefault: true,
    }),
}

interface OrgActivityPageProps {
    currentUserRole: Role
    sessionData: SessionResponse
}

export function OrgActivityPage({ sessionData }: OrgActivityPageProps) {
    if (!sessionData?.user || !sessionData.session?.activeOrganizationId) {
        return null
    }

    const authenticatedSessionData: OrgActivitySessionData = {
        ...sessionData,
        user: sessionData.user,
        session: { activeOrganizationId: sessionData.session.activeOrganizationId },
    }

    return <OrgActivityPageContent sessionData={authenticatedSessionData} />
}

function OrgActivityPageContent({ sessionData }: OrgActivityPageContentProps) {
    const { t } = useTranslation("team")
    const { state, meta } = useOrg()
    const { openProfile } = useMemberProfileDialog()
    const { openRequest } = useRequestSheet()
    const slug = meta.slug

    const [filters, setFilters] = useQueryStates(activityParsers)

    const actorId = filters.actorId || null
    const datePreset = parseSchema(datePresetSchema, filters.datePreset)
    const filterOpen = filters.filterOpen
    const eventTypes = useMemo(() => {
        const result = safeParseSchema(eventTypesSearchSchema, filters.eventTypes)
        return result.success ? result.data : null
    }, [filters.eventTypes])

    const setFilterOpen = useCallback(
        (open: boolean) => setFilters({ filterOpen: open }),
        [setFilters]
    )

    const setActorId = useCallback(
        (id: string | null) => setFilters({ actorId: id ?? "" }),
        [setFilters]
    )

    const setDatePreset = useCallback(
        (preset: DatePreset) => setFilters({ datePreset: preset }),
        [setFilters]
    )

    const handleDatePresetChange = useCallback(
        (value: string) => {
            const result = safeParseSchema(datePresetSchema, value)
            if (result.success) {
                setDatePreset(result.data)
            }
        },
        [setDatePreset]
    )

    const setEventTypes = useCallback(
        (types: string[] | null) =>
            setFilters({
                eventTypes: types === null ? "" : types.length === 0 ? "none" : types.join(","),
            }),
        [setFilters]
    )

    const handleClearFilters = useCallback(
        () => setFilters({ actorId: "", datePreset: "all", eventTypes: "" }),
        [setFilters]
    )

    const hasActiveFilters =
        Boolean(filters.actorId) || filters.datePreset !== "all" || Boolean(filters.eventTypes)

    const currentUserId = sessionData.user.id
    const organizationId = sessionData.session.activeOrganizationId

    const {
        data,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        isLoading,
        isFetching,
        isFetchedAfterMount,
        isPlaceholderData,
    } = useActivityEvents({
        organizationId,
        organizationSlug: slug,
        actorId,
        datePreset,
        eventTypes,
    })
    const activityQueryKey = useMemo(
        () =>
            activityKeys.events(organizationId, slug, {
                actorId,
                datePreset,
                eventTypes: eventTypes === null ? null : eventTypes.join(","),
            }),
        [actorId, datePreset, eventTypes, organizationId, slug]
    )

    const noEventTypesSelected = eventTypes !== null && eventTypes.length === 0

    const events = useMemo(
        () => (noEventTypesSelected ? [] : (data?.pages.flatMap((page) => page.events) ?? [])),
        [data, noEventTypesSelected]
    )
    const primaryDataSource: PrimaryDataSource = getQueryPrimaryDataSource({
        queryKey: activityQueryKey,
        hasData: Boolean(data),
        isFetchedAfterMount,
        isFetching,
        isPlaceholderData,
    })

    usePrimaryDataVisibleMetric({
        routeId: "org.team.activity",
        isVisible: !isLoading && Boolean(data),
        dataSource: primaryDataSource,
        queryKey: activityQueryKey,
        itemCount: events.length,
        detail: {
            datePreset,
            actorFilter: actorId ? "active" : "empty",
            eventTypeFilter: eventTypes ? "active" : "empty",
        },
    })

    return (
        <div className="flex min-h-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(state.org, [
                    { label: t("breadcrumb.team"), href: `/org/${slug}/team` },
                    { label: t("breadcrumb.activity") },
                ])}
            />

            <div className="bg-ds-canvas px-4 pt-6 pb-3 sm:px-6">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 overflow-x-auto">
                    {isLoading ? (
                        <>
                            <div className="flex min-w-max items-center gap-2">
                                <Skeleton className="h-8 w-[160px] rounded-md" />
                                <Skeleton className="h-8 w-[160px] rounded-md" />
                            </div>
                            <Skeleton className="size-8 rounded-full" />
                        </>
                    ) : (
                        <>
                            <div className="flex min-w-max items-center gap-2">
                                <ActorFilter
                                    organizationId={organizationId}
                                    value={actorId}
                                    onChange={setActorId}
                                    currentUserId={currentUserId}
                                    className="w-[160px]"
                                />

                                <Select value={datePreset} onValueChange={handleDatePresetChange}>
                                    <SelectTrigger size="sm" className="w-[160px] font-normal">
                                        <span className="flex items-center gap-2">
                                            <Clock className="size-4 text-ds-fg-muted" />
                                            <SelectValue />
                                        </span>
                                    </SelectTrigger>
                                    <SelectContent className="min-w-[200px]">
                                        {Object.entries(DATE_PRESET_LABELS).map(
                                            ([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <EventTypeFilterTrigger
                                selectedTypes={eventTypes}
                                onOpen={() => setFilterOpen(true)}
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-ds-canvas px-4 py-4 sm:px-6">
                <div className="mx-auto w-full max-w-5xl">
                    {isLoading ? (
                        <ActivityListSkeleton />
                    ) : (
                        <div
                            className={
                                isFetching && !isFetchingNextPage
                                    ? "opacity-50 transition-opacity"
                                    : "opacity-100 transition-opacity"
                            }
                        >
                            <ActivityList
                                events={events}
                                currentUserId={currentUserId}
                                hasNextPage={!!hasNextPage}
                                isFetchingNextPage={isFetchingNextPage}
                                onLoadMore={fetchNextPage}
                                hasActiveFilters={hasActiveFilters}
                                onClearFilters={handleClearFilters}
                                onOpenMemberProfile={openProfile}
                                onOpenRequest={openRequest}
                            />
                        </div>
                    )}
                </div>
            </div>

            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetContent
                    side="right"
                    className="!h-[calc(100vh-1.5rem)] !w-4/10 !max-w-2xl bottom-3 m-3 rounded-lg bg-ds-surface p-0 [box-shadow:var(--shadow-bottom-sheet)]"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <SheetHeader>
                        <SheetTitle>{t("activity.filterSheetTitle")}</SheetTitle>
                    </SheetHeader>
                    {filterOpen && (
                        <EventTypeFilter
                            organizationId={organizationId}
                            organizationSlug={slug}
                            selectedTypes={eventTypes}
                            onSelectionChange={setEventTypes}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
