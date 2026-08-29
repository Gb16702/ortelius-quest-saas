import { ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { SessionResponse } from "@/entities/session"
import { LeaveOrganizationCard } from "@/features/organization"
import { publicEnv } from "@/shared/config/env"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Button } from "@/shared/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"

interface MeAccountPageProps {
    sessionData: SessionResponse | null
}

export function MeAccountPage({ sessionData }: MeAccountPageProps) {
    const { t } = useTranslation("account")

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav items={[{ label: t("breadcrumb") }]} />
            <ProfilePageHead title={t("head.title")} subtitle={t("head.subtitle")} />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="flex w-full max-w-[theme(width.7xl)] flex-col py-6">
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <div className="space-y-1">
                                    <CardTitle>{t("profile.title")}</CardTitle>
                                    <CardDescription>{t("profile.description")}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardFooter className="justify-end">
                                <Button asChild radius="full">
                                    <a
                                        href={publicEnv.PORTAL_ACCOUNT_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {t("profile.openPortal")}
                                        <ExternalLink className="ml-1 h-4 w-4" />
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>

                        <LeaveOrganizationCard sessionData={sessionData} />
                    </div>
                </div>
            </div>
        </div>
    )
}
