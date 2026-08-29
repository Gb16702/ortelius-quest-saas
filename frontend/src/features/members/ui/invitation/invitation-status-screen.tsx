import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

type InvitationStatusScreenVariant = "loading" | "invalid" | "expired"

interface InvitationStatusScreenProps {
    variant: InvitationStatusScreenVariant
    error?: string
}

interface InvitationStatusCardProps {
    icon: LucideIcon
    title: string
    description: string
    descriptionPlacement?: "header" | "content"
    details?: string
    withShadow?: boolean
}

function InvitationStatusCard({
    icon: Icon,
    title,
    description,
    descriptionPlacement = "header",
    details,
    withShadow = false,
}: InvitationStatusCardProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <Card withShadow={withShadow} className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <Icon className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-red-600">{title}</CardTitle>
                    {descriptionPlacement === "header" && (
                        <CardDescription>{description}</CardDescription>
                    )}
                </CardHeader>
                {(descriptionPlacement === "content" || details) && (
                    <CardContent>
                        {descriptionPlacement === "content" && (
                            <CardDescription>{description}</CardDescription>
                        )}
                        {details && <p className="text-gray-600 text-sm">{details}</p>}
                    </CardContent>
                )}
            </Card>
        </div>
    )
}

export function InvitationStatusScreen({ variant, error }: InvitationStatusScreenProps) {
    const { t } = useTranslation("invitation")

    if (variant === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center space-y-4">
                    <Spinner className="size-8" />
                    <p className="text-gray-600">{t("loading")}</p>
                </div>
            </div>
        )
    }

    if (variant === "expired") {
        return (
            <InvitationStatusCard
                icon={Clock}
                title={t("expired.title")}
                description={t("expired.description")}
                details={t("expired.details")}
            />
        )
    }

    return (
        <InvitationStatusCard
            icon={AlertTriangle}
            title={t("invalid.title")}
            description={error || t("invalid.description")}
            descriptionPlacement="content"
            withShadow
        />
    )
}
