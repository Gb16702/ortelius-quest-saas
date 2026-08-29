import { useTranslation } from "react-i18next"
import { useUserRole } from "@/entities/access"
import { useOrganizationInfo } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import { Button } from "@/shared/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card"
import { useLeaveOrganizationDialog } from "../model/hooks/use-leave-organization-dialog"

interface LeaveOrganizationCardProps {
    sessionData: SessionResponse | null
}

export function LeaveOrganizationCard({ sessionData }: LeaveOrganizationCardProps) {
    const { t } = useTranslation("account")
    const activeOrganizationId = sessionData?.session?.activeOrganizationId ?? null

    const { data: orgInfo } = useOrganizationInfo(activeOrganizationId)
    const { data: userRole } = useUserRole(activeOrganizationId)
    const { open } = useLeaveOrganizationDialog()

    if (!activeOrganizationId || !orgInfo?.name) return null
    if (userRole === "owner") return null

    return (
        <Card className="border-ds-danger-soft-hover">
            <CardHeader>
                <CardTitle>{t("leaveOrganization.title")}</CardTitle>
                <CardDescription>
                    {t("leaveOrganization.description", { organizationName: orgInfo.name })}
                </CardDescription>
            </CardHeader>
            <CardFooter className="mt-2 justify-end border-t-ds-danger-soft-hover bg-ds-danger-soft">
                <Button variant="danger" size="sm" radius="full" onClick={open}>
                    {t("leaveOrganization.action")}
                </Button>
            </CardFooter>
        </Card>
    )
}
