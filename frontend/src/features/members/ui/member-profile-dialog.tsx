import { useQueryClient } from "@tanstack/react-query"
import { MessageSquare, MoreHorizontal, Star, UserMinus, UserPen } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { isAdminOrOwner, parseRole, useUserRole } from "@/entities/access"
import type { MemberProfileResponse, OrganizationMember } from "@/entities/member"
import { membersKeys, useMemberProfile } from "@/entities/member"
import { useOrgOptional } from "@/entities/organization"
import type { ActiveOrganization, SessionResponse } from "@/entities/session"
import { useUser } from "@/entities/session"
import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Separator } from "@/shared/ui/separator"
import { Skeleton } from "@/shared/ui/skeleton"
import { showRetryErrorToast, showSuccessToast, showUndoToast } from "@/shared/ui/toasts"
import { useRemoveMember } from "../api/member-organization.mutations"
import { useUpdateMemberRole } from "../api/member-role.mutations"
import { useMembersPageOptional } from "../model/members-page.provider"
import { EditMemberRoleDialog } from "./edit-member-role-dialog"
import { MemberProfileActivity } from "./member-profile-activity"
import { MemberProfileBanner } from "./member-profile-banner"
import { MemberProfileRequests } from "./member-profile-requests"
import { RemoveMemberDialog } from "./remove-member-dialog"

type ProfileAction =
    | { type: "idle" }
    | { type: "edit"; member: OrganizationMember; selectedRole: string }
    | { type: "remove"; member: OrganizationMember }

interface MemberProfileDialogProps {
    userId: string
    isOpen: boolean
    onClose: () => void
    sessionData: SessionResponse | null
    activeOrganization: ActiveOrganization | null
    onOpenRequest?: (requestNumber: string) => void
    onNavigate?: (href: string) => void
    onStartMemberDm?: (targetUserId: string) => void
    onAddMemberToFavorites?: (target: {
        userId: string
        name: string
        image?: string | null
    }) => void
    onRemoveMemberFromFavorites?: (target: {
        userId: string
        name: string
        image?: string | null
    }) => void
    isMemberFavorite?: boolean
    isStartingMemberDm?: boolean
    isTogglingMemberFavorite?: boolean
}

interface MemberProfileActionMenuProps {
    user: { id: string; name: string; image?: string | null }
    member: OrganizationMember | undefined
    canToggleMemberFavorite: boolean
    isMemberFavorite: boolean
    canStartMemberDm: boolean
    canActOnMember: boolean
    isStartingMemberDm: boolean
    isTogglingMemberFavorite: boolean
    onStartMemberDm?: (targetUserId: string) => void
    onAddMemberToFavorites?: (target: {
        userId: string
        name: string
        image?: string | null
    }) => void
    onRemoveMemberFromFavorites?: (target: {
        userId: string
        name: string
        image?: string | null
    }) => void
    onEditRole: (member: OrganizationMember) => void
    onRemoveMember: (member: OrganizationMember) => void
}

function MemberProfileActionMenu({
    user,
    member,
    canToggleMemberFavorite,
    isMemberFavorite,
    canStartMemberDm,
    canActOnMember,
    isStartingMemberDm,
    isTogglingMemberFavorite,
    onStartMemberDm,
    onAddMemberToFavorites,
    onRemoveMemberFromFavorites,
    onEditRole,
    onRemoveMember,
}: MemberProfileActionMenuProps) {
    const { t } = useTranslation("team")
    const favoriteActionLabel = isMemberFavorite
        ? t("profile.removeFavorite")
        : t("profile.addFavorite")

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button radius="full" variant="outline" className="h-8 w-8 p-0">
                    <span className="sr-only">{t("profile.memberActionsLabel")}</span>
                    <MoreHorizontal className="size-4 text-ds-fg-muted" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {canToggleMemberFavorite && (
                    <DropdownMenuItem
                        size="xs"
                        disabled={isTogglingMemberFavorite}
                        onClick={() => {
                            const target = {
                                userId: user.id,
                                name: user.name,
                                image: user.image,
                            }

                            if (isMemberFavorite) {
                                onRemoveMemberFromFavorites?.(target)
                                return
                            }

                            onAddMemberToFavorites?.(target)
                        }}
                    >
                        <Star
                            className="mr-1 size-4 text-ds-fg"
                            fill={isMemberFavorite ? "currentColor" : "none"}
                        />
                        {favoriteActionLabel}
                    </DropdownMenuItem>
                )}
                {canStartMemberDm && (
                    <DropdownMenuItem
                        size="xs"
                        disabled={isStartingMemberDm}
                        onClick={() => {
                            onStartMemberDm?.(user.id)
                        }}
                    >
                        <MessageSquare className="mr-1 size-4 text-ds-fg" />
                        {t("profile.chatWithMember", { name: user.name })}
                    </DropdownMenuItem>
                )}
                {canActOnMember && member && (
                    <>
                        <DropdownMenuItem
                            size="xs"
                            onClick={() => {
                                onEditRole(member)
                            }}
                        >
                            <UserPen className="mr-1 size-4 text-ds-fg" />
                            {t("profile.editRole")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            size="xs"
                            variant="destructive"
                            onClick={() => {
                                onRemoveMember(member)
                            }}
                        >
                            <UserMinus className="mr-1 size-4" />
                            {t("profile.removeMember")}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function MemberProfileDialog({
    userId,
    isOpen,
    onClose,
    sessionData,
    activeOrganization,
    onOpenRequest,
    onNavigate,
    onStartMemberDm,
    onAddMemberToFavorites,
    onRemoveMemberFromFavorites,
    isMemberFavorite = false,
    isStartingMemberDm = false,
    isTogglingMemberFavorite = false,
}: MemberProfileDialogProps) {
    const { t } = useTranslation("team")
    const currentUser = useUser()
    const orgContext = useOrgOptional()
    const activeOrganizationId =
        orgContext?.state.org.id ?? sessionData?.session?.activeOrganizationId ?? ""
    const organizationSlug = orgContext?.meta.slug ?? activeOrganization?.slug ?? null
    const membersPage = useMembersPageOptional()
    const { data: fallbackRole } = useUserRole(membersPage ? null : activeOrganizationId)
    const currentUserRole = membersPage?.state.currentUserRole ?? fallbackRole ?? "member"
    const parsedRole = parseRole(currentUserRole)
    const isAdmin = parsedRole ? isAdminOrOwner(parsedRole) : false

    const [action, setAction] = useState<ProfileAction>({ type: "idle" })
    const queryClient = useQueryClient()

    const updateRoleMutation = useUpdateMemberRole(activeOrganizationId)
    const removeMemberMutation = useRemoveMember(activeOrganizationId)

    const {
        data: profile,
        isLoading,
        error,
    } = useMemberProfile(userId, activeOrganizationId, {
        enabled: isOpen && !!userId,
    })

    const isCurrentUser = currentUser?.id === userId
    const member =
        membersPage?.state.members.find((m) => m.user.id === userId) ??
        createOrganizationMemberFromProfile(profile)
    const canActOnMember =
        member && !isCurrentUser
            ? membersPage
                ? membersPage.actions.canPerformAction(member.role, member.user.id)
                : isAdmin
            : false
    const canToggleMemberFavorite =
        !isCurrentUser &&
        !!activeOrganizationId &&
        (isMemberFavorite ? !!onRemoveMemberFromFavorites : !!onAddMemberToFavorites)
    const canStartMemberDm = !isCurrentUser && !!activeOrganizationId && !!onStartMemberDm
    const hasMemberActions = canToggleMemberFavorite || canStartMemberDm || canActOnMember
    const closeAction = () => setAction({ type: "idle" })

    const confirmEditRole = () => {
        if (action.type !== "edit") return
        const memberId = action.member.id
        const nextRole = action.selectedRole
        const previousRole = action.member.role
        updateRoleMutation.mutate(
            { memberId, role: nextRole },
            {
                onSuccess: () => {
                    showUndoToast(t("members.toast.roleUpdated"), {
                        onUndo: () => updateRoleMutation.mutate({ memberId, role: previousRole }),
                    })
                    queryClient.invalidateQueries({
                        queryKey: membersKeys.profile(activeOrganizationId, userId),
                    })
                    closeAction()
                },
                onError: () =>
                    showRetryErrorToast(t("members.toast.roleUpdateFailed"), {
                        onRetry: () => updateRoleMutation.mutate({ memberId, role: nextRole }),
                    }),
            }
        )
    }

    const confirmRemoveMember = () => {
        if (action.type !== "remove") return
        const memberId = action.member.id
        removeMemberMutation.mutate(memberId, {
            onSuccess: () => {
                showSuccessToast(t("members.toast.removeSuccess"))
                closeAction()
                onClose()
            },
            onError: () =>
                showRetryErrorToast(t("members.toast.removeFailed"), {
                    onRetry: () => removeMemberMutation.mutate(memberId),
                }),
        })
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="max-h-[85vh] w-full max-w-2xl overflow-y-auto p-0"
                >
                    <DialogHeader className="sr-only">
                        <DialogTitle>{t("profile.dialogTitle")}</DialogTitle>
                    </DialogHeader>

                    {isLoading && (
                        <div className="flex flex-col gap-y-4 p-6">
                            <Skeleton className="h-32 w-full" />
                            <div className="flex items-center gap-x-4">
                                <Skeleton className="h-16 w-16 rounded-full" />
                                <div className="flex flex-col gap-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </div>
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center gap-y-2 p-12 text-center">
                            <h3 className="font-semibold text-ds-fg text-lg">
                                {t("profile.loadFailedTitle")}
                            </h3>
                            <p className="text-ds-fg-muted text-sm">
                                {error instanceof Error
                                    ? error.message
                                    : t("profile.loadFailedDescription")}
                            </p>
                        </div>
                    )}

                    {profile && !isLoading && !error && (
                        <div className="flex flex-col">
                            <div className="relative">
                                <MemberProfileBanner
                                    user={profile.user}
                                    membership={profile.membership}
                                    isCurrentUser={isCurrentUser}
                                />
                                {hasMemberActions && (
                                    <div className="absolute top-3 right-3">
                                        <MemberProfileActionMenu
                                            user={profile.user}
                                            member={member}
                                            canToggleMemberFavorite={canToggleMemberFavorite}
                                            isMemberFavorite={isMemberFavorite}
                                            canStartMemberDm={canStartMemberDm}
                                            canActOnMember={canActOnMember}
                                            isStartingMemberDm={isStartingMemberDm}
                                            isTogglingMemberFavorite={isTogglingMemberFavorite}
                                            onStartMemberDm={onStartMemberDm}
                                            onAddMemberToFavorites={onAddMemberToFavorites}
                                            onRemoveMemberFromFavorites={
                                                onRemoveMemberFromFavorites
                                            }
                                            onEditRole={(selectedMember) => {
                                                setAction({
                                                    type: "edit",
                                                    member: selectedMember,
                                                    selectedRole: selectedMember.role,
                                                })
                                            }}
                                            onRemoveMember={(selectedMember) => {
                                                setAction({
                                                    type: "remove",
                                                    member: selectedMember,
                                                })
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <MemberProfileRequests
                                requests={profile.assignedRequests}
                                userId={userId}
                                isCurrentUser={isCurrentUser}
                                onOpenRequest={onOpenRequest}
                                organizationSlug={organizationSlug}
                                onNavigate={onNavigate}
                            />

                            {isAdmin && (
                                <>
                                    <Separator />
                                    <MemberProfileActivity
                                        userId={userId}
                                        organizationSlug={organizationSlug}
                                        organizationId={activeOrganizationId}
                                        onOpenRequest={onOpenRequest}
                                        onNavigate={onNavigate}
                                    />
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {action.type === "edit" && (
                <EditMemberRoleDialog
                    isOpen={true}
                    member={action.member}
                    selectedRole={action.selectedRole}
                    onClose={closeAction}
                    onRoleChange={(role) => {
                        setAction({ ...action, selectedRole: role })
                    }}
                    onConfirm={confirmEditRole}
                    isSubmitting={updateRoleMutation.isPending}
                />
            )}

            {action.type === "remove" && (
                <RemoveMemberDialog
                    isOpen={true}
                    member={action.member}
                    organizationId={activeOrganizationId}
                    onClose={closeAction}
                    onConfirm={confirmRemoveMember}
                    isSubmitting={removeMemberMutation.isPending}
                />
            )}
        </>
    )
}

function createOrganizationMemberFromProfile(
    profile: MemberProfileResponse | undefined
): OrganizationMember | undefined {
    if (!profile?.membership.id) return undefined

    return {
        id: profile.membership.id,
        role: profile.membership.role,
        createdAt: profile.membership.joinedAt,
        lastSeenAt: null,
        user: {
            id: profile.user.id,
            name: profile.user.name,
            email: profile.user.email,
            image: profile.user.image,
            twoFactorEnabled: null,
        },
    }
}
