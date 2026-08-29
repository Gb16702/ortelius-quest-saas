import { useTranslation } from "react-i18next"
import { getOrgBreadcrumbItems, useOrgOptional } from "@/entities/organization"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import { useRequestsPage } from "../model/requests-page.provider"
import { AssignRequestDialog } from "./assign-request-dialog"
import { RequestsTable } from "./requests-table"

export function RequestsPageContent() {
    const { t } = useTranslation("requests")
    const { state, actions } = useRequestsPage()
    const orgContext = useOrgOptional()
    const breadcrumbItems = [{ label: t("page.breadcrumb") }]
    const resolvedBreadcrumbItems = orgContext
        ? getOrgBreadcrumbItems(orgContext.state.org, breadcrumbItems)
        : breadcrumbItems

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav items={resolvedBreadcrumbItems} />
            <ProfilePageHead
                title={state.isOrganizationView ? t("page.incomingTitle") : t("page.outgoingTitle")}
                subtitle={
                    state.isOrganizationView
                        ? t("page.incomingSubtitle")
                        : t("page.outgoingSubtitle")
                }
                maxWidth="5xl"
            />

            <div className="flex w-full min-w-0 flex-col items-center px-4 sm:px-6">
                <div className="w-full min-w-0 max-w-5xl py-6">
                    <RequestsTable />
                </div>
            </div>

            {state.isAssignDialogOpen && state.selectedRequestForAssignment && (
                <AssignRequestDialog
                    key={`${state.selectedRequestForAssignment.id}-${state.selectedRequestForAssignment.assignedTo?.id || "unassigned"}`}
                    isOpen={true}
                    onClose={actions.closeAssignDialog}
                    members={state.assignDialogMembers}
                    currentAssignee={state.selectedRequestForAssignment.assignedTo}
                    currentUserId={state.currentUserId}
                    requestNumber={state.selectedRequestForAssignment.reqNumber}
                    isLoading={state.isAssigning}
                    isLoadingMembers={state.isLoadingMembers}
                    onAssign={actions.assignMember}
                    onUnassign={actions.unassignMember}
                />
            )}
        </div>
    )
}
