import { useTranslation } from "react-i18next"
import { parseRole } from "@/entities/access"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import { useMembersPage } from "../model/members-page.provider"
import { EditMemberRoleDialog } from "./edit-member-role-dialog"
import { InviteMemberBreadcrumbAction } from "./invite-member-breadcrumb-action"
import { InviteMemberDialog } from "./invite-member-dialog"
import { MemberFilters } from "./member-filters"
import { MembersTable } from "./members-table"
import { RemoveMemberDialog } from "./remove-member-dialog"

export function MembersPageContent() {
    const { t } = useTranslation("team")
    const { state, actions } = useMembersPage()
    const { state: orgState, meta } = useOrg()

    const breadcrumbItems = getOrgBreadcrumbItems(orgState.org, [
        { label: t("breadcrumb.team"), href: `/org/${meta.slug}/team` },
        { label: t("breadcrumb.members") },
    ])

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav
                items={breadcrumbItems}
                actions={
                    state.canInviteMembers ? (
                        <InviteMemberBreadcrumbAction onInvite={actions.openInviteDialog} />
                    ) : null
                }
            />
            <ProfilePageHead
                title={t("members.title")}
                subtitle={
                    parseRole(state.currentUserRole) === "member"
                        ? t("members.subtitleMember")
                        : t("members.subtitleAdmin")
                }
                maxWidth="5xl"
            />

            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="w-full max-w-5xl py-6">
                    <div className="space-y-3">
                        <MemberFilters
                            searchValue={state.searchValue}
                            selectedRoles={state.selectedRoles}
                            selectedStatuses={state.selectedStatuses}
                            activeTab="members"
                            roleOptions={state.roleOptions}
                            statusOptions={state.statusOptions}
                            onSearchChange={actions.updateSearch}
                            onRoleChange={actions.updateRoleFilter}
                            onStatusChange={actions.updateStatusFilter}
                        />

                        <div className="relative">
                            <MembersTable />
                        </div>
                    </div>
                </div>
            </div>

            {state.dialog.type === "invite" && (
                <InviteMemberDialog
                    isOpen={true}
                    onClose={actions.closeDialog}
                    organizationId={orgState.org.id}
                    isInviting={state.isInviting}
                    availableRoles={state.availableRoles}
                    onInviteSubmit={actions.sendInvitations}
                />
            )}

            {state.dialog.type === "edit" && (
                <EditMemberRoleDialog
                    isOpen={true}
                    member={state.selectedMember}
                    selectedRole={state.dialog.selectedRole}
                    onClose={actions.closeDialog}
                    onRoleChange={actions.updateDialogRole}
                    onConfirm={actions.confirmEditRole}
                    isSubmitting={state.isUpdatingRole}
                />
            )}

            {state.dialog.type === "remove" && (
                <RemoveMemberDialog
                    isOpen={true}
                    member={state.removingMember}
                    organizationId={orgState.org.id}
                    onClose={actions.closeDialog}
                    onConfirm={actions.confirmRemoveMember}
                    isSubmitting={state.isRemovingMember}
                />
            )}
        </div>
    )
}
