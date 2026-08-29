import { OctagonAlert } from "lucide-react"
import { useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { createOrganizationBrandColorStyle } from "@/entities/organization"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"
import { showErrorToast } from "@/shared/ui/toasts"
import { acceptInvitationById } from "../../api/invitation-acceptance.api"
import {
    type InvitationRouteData,
    InvitationState,
    type InvitationStateValue,
} from "../../model/invitation.state"
import { InvitationStatusScreen } from "./invitation-status-screen"
import { InviterProfileCard } from "./inviter-profile-card"

interface InvitationPageContentProps {
    loaderData: InvitationRouteData
    onNavigate?: (href: string) => void
}

function defaultNavigate(href: string): void {
    if (typeof window === "undefined") return
    window.location.assign(href)
}

export function InvitationPageContent({
    loaderData,
    onNavigate = defaultNavigate,
}: InvitationPageContentProps) {
    const { t } = useTranslation("invitation")
    const { t: tCommon } = useTranslation("common")
    const [currentState, setCurrentState] = useState<InvitationStateValue>(
        loaderData.state || InvitationState.LOADING
    )
    const [isAccepting, setIsAccepting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const acceptInvitation = async () => {
        setIsAccepting(true)
        setError(null)
        setCurrentState(InvitationState.PROCESSING)

        try {
            const result = await acceptInvitationById(loaderData.invitationId)

            if (result.status === "invalid") {
                setError(t(result.errorKey, { defaultValue: result.message }))
                setCurrentState(InvitationState.INVALID)
                return
            }

            if (result.status === "error") {
                const message = t(result.errorKey, { defaultValue: result.message })
                setError(message)
                setCurrentState(InvitationState.ERROR)
                showErrorToast(message)
                return
            }

            onNavigate(result.redirectTo)
        } finally {
            setIsAccepting(false)
        }
    }

    if (currentState === InvitationState.LOADING) {
        return <InvitationStatusScreen variant="loading" />
    }

    if (currentState === InvitationState.INVALID || !loaderData.invitation) {
        return (
            <InvitationStatusScreen
                variant="invalid"
                error={loaderData.error || error || undefined}
            />
        )
    }

    if (currentState === InvitationState.EXPIRED || loaderData.invitation.isExpired) {
        return <InvitationStatusScreen variant="expired" />
    }

    const invitation = loaderData.invitation
    const isUnauthenticated = currentState === InvitationState.UNAUTHENTICATED
    const invitationPath = loaderData.invitationId
        ? `/invitation/${loaderData.invitationId}`
        : "/invitation"
    const redirectQuery = `redirect=${encodeURIComponent(invitationPath)}&email=${encodeURIComponent(invitation.email)}`
    const signInUrl = `/sign-in?${redirectQuery}`
    const organizationStyles = createOrganizationBrandColorStyle(invitation.organization.brandColor)
    const isAdminRole = invitation.role === "admin"
    const roleLabel = isAdminRole
        ? tCommon("role.admin").toLowerCase()
        : tCommon("role.member").toLowerCase()
    const inviterName = invitation.inviter?.name ?? ""
    const descriptionKey = invitation.inviter?.name
        ? isAdminRole
            ? "card.inviterDescription_admin"
            : "card.inviterDescription_member"
        : isAdminRole
          ? "card.anonymousDescription_admin"
          : "card.anonymousDescription_member"

    return (
        <div
            className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8"
            style={organizationStyles}
        >
            <div className="relative w-full max-w-md">
                {invitation.inviter && <InviterProfileCard inviter={invitation.inviter} />}
                <Card withShadow className="w-full rounded-3xl">
                    <CardHeader className="px-12 pt-12 text-center">
                        {invitation.organization.logo && (
                            <div className="mx-auto mb-4 h-12 w-12">
                                <img
                                    src={invitation.organization.logo}
                                    alt={t("card.logoAlt", {
                                        organizationName: invitation.organization.name,
                                    })}
                                    className="h-full w-full rounded-full object-contain"
                                />
                            </div>
                        )}
                        <CardTitle className="font-bold text-2xl">
                            {t("card.joinTitle", {
                                organizationName: invitation.organization.name,
                            })}
                        </CardTitle>
                        <CardDescription>
                            <Trans
                                i18nKey={descriptionKey}
                                t={t}
                                values={{ inviterName, roleLabel }}
                                components={{
                                    inviter: <span className="font-semibold text-ds-fg" />,
                                    role: <span className="font-semibold text-ds-fg" />,
                                }}
                            />
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="h-full min-h-60 space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <OctagonAlert className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>

                    <div className="flex w-full flex-col items-center gap-2 border-ds-surface-border border-t bg-ds-canvas py-4">
                        {isUnauthenticated ? (
                            invitation.userExists ? (
                                <>
                                    <Button
                                        className="w-[calc(100%-2rem)] font-semibold"
                                        onClick={() => onNavigate(signInUrl)}
                                    >
                                        {t("card.signInToAccept")}
                                    </Button>
                                    <Button
                                        className="font-semibold"
                                        variant="text"
                                        onClick={() => onNavigate(signInUrl)}
                                    >
                                        {t("card.useDifferentAccount")}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        className="w-[calc(100%-2rem)] font-semibold"
                                        onClick={() => onNavigate(signInUrl)}
                                    >
                                        {t("card.signInToAccept")}
                                    </Button>
                                    <Button
                                        className="font-semibold"
                                        variant="text"
                                        onClick={() => onNavigate(signInUrl)}
                                    >
                                        {t("card.alreadyHaveAccount")}
                                    </Button>
                                </>
                            )
                        ) : (
                            <Button
                                className="font-semibold disabled:border-none disabled:bg-transparent"
                                variant="text"
                                onClick={acceptInvitation}
                                disabled={isAccepting}
                            >
                                {isAccepting ? (
                                    <Spinner />
                                ) : (
                                    t("card.joinAction", {
                                        organizationName: invitation.organization.name,
                                    })
                                )}
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
