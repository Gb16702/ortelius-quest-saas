import { useTranslation } from "react-i18next"
import { ROLE_OPTIONS } from "@/entities/access"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"

import { INVITATION_STATUS_OPTIONS, useInvitationsPage } from "../model/invitations-page.provider"
import { CancelInvitationDialog } from "./cancel-invitation-dialog"
import { EditInvitationRoleDialog } from "./edit-invitation-role-dialog"
import { InvitationsTable } from "./invitations-table"
import { InviteMemberBreadcrumbAction } from "./invite-member-breadcrumb-action"
import { InviteMemberDialog } from "./invite-member-dialog"
import { MemberFilters } from "./member-filters"

export function InvitationsPageContent() {
    const { t } = useTranslation("team")
    const { state, actions } = useInvitationsPage()
    const { state: orgState, meta } = useOrg()

    const breadcrumbItems = getOrgBreadcrumbItems(orgState.org, [
        { label: t("breadcrumb.team"), href: `/org/${meta.slug}/team` },
        { label: t("breadcrumb.invitations") },
    ])

    const translatedStatusOptions = INVITATION_STATUS_OPTIONS.map((option) => ({
        ...option,
        label: t(`invitationStatus.${option.value}`, { defaultValue: option.label }),
    }))

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav
                items={breadcrumbItems}
                actions={
                    state.canManageInvitations ? (
                        <InviteMemberBreadcrumbAction onInvite={actions.openInviteDialog} />
                    ) : null
                }
            />
            <ProfilePageHead
                title={t("invitations.title")}
                subtitle={t("invitations.subtitle")}
                maxWidth="5xl"
            />

            <div className={"flex w-full flex-col items-center px-4 sm:px-6"}>
                <div className="w-full max-w-5xl py-6">
                    <div className="space-y-3">
                        <MemberFilters
                            searchValue={state.search}
                            selectedRoles={state.selectedRoles}
                            selectedStatuses={state.selectedStatuses}
                            activeTab="invitations"
                            roleOptions={state.roleOptions}
                            statusOptions={translatedStatusOptions}
                            onSearchChange={actions.updateSearch}
                            onRoleChange={actions.updateRoleFilter}
                            onStatusChange={actions.updateStatusFilter}
                        />

                        <div className="relative">
                            <InvitationsTable
                                invitations={state.invitations}
                                isLoading={state.isLoading}
                                hasActiveFilters={state.hasActiveFilters}
                                onClearFilters={actions.clearFilters}
                                onResendInvitation={actions.resendInvitation}
                                onEditInvitationRole={actions.editInvitationRole}
                                onCancelInvitation={actions.promptCancelInvitation}
                                onArchiveInvitation={actions.archiveInvitation}
                                onUnarchiveInvitation={actions.unarchiveInvitation}
                                isArchiving={state.isArchiving}
                                isUnarchiving={state.isUnarchiving}
                                canManageInvitations={state.canManageInvitations}
                                pageSize={state.pageSize}
                                onPageSizeChange={actions.updatePageSize}
                                onPageChange={actions.updatePage}
                                paginationInfo={state.pagination}
                                isPlaceholderData={state.isPlaceholderData}
                                isFetching={state.isFetching}
                                rowSelection={state.rowSelection}
                                onRowSelectionChange={actions.setRowSelection}
                                onExport={actions.exportInvitations}
                                canExport={state.canManageInvitations}
                                isExporting={state.isExporting}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {state.showInviteDialog && (
                <InviteMemberDialog
                    isOpen={true}
                    onClose={actions.closeInviteDialog}
                    organizationId={orgState.org.id}
                    isInviting={state.isInviting}
                    availableRoles={ROLE_OPTIONS}
                    onInviteSubmit={actions.sendInvitations}
                />
            )}

            {state.editingInvitation && (
                <EditInvitationRoleDialog
                    isOpen={true}
                    invitation={state.editingInvitation}
                    selectedRole={state.selectedRole}
                    onClose={actions.closeModals}
                    onRoleChange={actions.setSelectedRole}
                    onConfirm={actions.confirmEditRole}
                    isSubmitting={state.isUpdatingRole}
                />
            )}

            {state.cancelingInvitation && (
                <CancelInvitationDialog
                    isOpen={true}
                    invitation={state.cancelingInvitation}
                    selectedCount={
                        Object.keys(state.rowSelection).filter((key) => state.rowSelection[key])
                            .length
                    }
                    onClose={actions.closeModals}
                    onConfirm={actions.confirmCancelInvitation}
                    isSubmitting={state.isCanceling}
                />
            )}
        </div>
    )
}
