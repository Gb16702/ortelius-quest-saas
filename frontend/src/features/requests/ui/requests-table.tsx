import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import { DataTable } from "@/shared/ui/data-table"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/shared/ui/empty"
import { RequestsIcon } from "@/shared/ui/sidebar-icons"
import type { TableSkeletonConfig } from "@/shared/ui/table-skeleton"
import type { UserRequest } from "../model/request"
import { useRequestsPage } from "../model/requests-page.provider"
import { RequestFilters } from "./request-filters"

const REQUESTS_TABLE_SKELETON_CONFIG: TableSkeletonConfig = {
    name: "requests",
    columns: [
        { type: "text-medium", align: "left" },
        { type: "avatar-name", align: "left" },
        { type: "badge", align: "left" },
        { type: "date", align: "left" },
        { type: "actions", align: "right" },
    ],
    defaultRows: 8,
}

export function RequestsTable() {
    const { t } = useTranslation("requests")
    const { state, actions } = useRequestsPage()
    const emptyState = state.hasRequestsError ? (
        <Empty className="border-0">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <AlertTriangle className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{t("table.empty.errorTitle")}</EmptyTitle>
                {state.requestsErrorMessage && (
                    <EmptyDescription>{state.requestsErrorMessage}</EmptyDescription>
                )}
            </EmptyHeader>
            <EmptyContent>
                <Button variant="outline" size="sm" radius="full" onClick={actions.retryRequests}>
                    {t("action.retry", { ns: "common" })}
                </Button>
            </EmptyContent>
        </Empty>
    ) : state.hasActiveFilters ? (
        <Empty className="border-0">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <RequestsIcon />
                </EmptyMedia>
                <EmptyTitle>{t("table.empty.filteredTitle")}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
                <Button variant="outline" size="sm" radius="full" onClick={actions.clearFilters}>
                    {t("table.empty.clearFilters")}
                </Button>
            </EmptyContent>
        </Empty>
    ) : (
        <Empty className="border-0">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <RequestsIcon />
                </EmptyMedia>
                <EmptyTitle>
                    {state.isOrganizationView
                        ? t("table.empty.incomingTitle")
                        : t("table.empty.outgoingTitle")}
                </EmptyTitle>
            </EmptyHeader>
        </Empty>
    )

    return (
        <DataTable
            columns={state.columns as ColumnDef<UserRequest>[]}
            data={state.requests}
            searchPlaceholder={t("table.searchPlaceholder")}
            searchValue={state.searchQuery}
            onSearchChange={actions.updateSearch}
            isLoading={state.isLoading}
            skeletonConfig={REQUESTS_TABLE_SKELETON_CONFIG}
            filters={
                <RequestFilters
                    dateRange={state.dateRange}
                    selectedStatuses={state.selectedStatuses}
                    statusOptions={state.statusOptions}
                    onStatusChange={actions.updateStatusFilter}
                    onDateRangeChange={actions.changeDateRange}
                    selectedPriorities={state.selectedPriorities}
                    onPriorityChange={actions.updatePriorityFilter}
                    organizationId={state.organizationId}
                    assignedTo={state.selectedAssignees}
                    onAssignedToChange={actions.updateAssignedToFilter}
                    currentUserId={state.currentUserId}
                    isOrganizationView={state.isOrganizationView}
                />
            }
            paginationInfo={state.pagination}
            pageSize={state.pagination.limit}
            onPageSizeChange={actions.updatePageSize}
            onPageChange={actions.updatePage}
            showPageInfo={true}
            pageInfoLabel={t("table.pageInfoLabel")}
            isPlaceholderData={state.isPlaceholderData}
            isFetching={state.isFetching}
            onRowClick={actions.onRowClick}
            emptyState={emptyState}
        />
    )
}
