import { useTranslation } from "react-i18next"
import type { OrganizationShowcaseService } from "@/entities/organization"

interface OrganizationShowcaseServicesProps {
    services: OrganizationShowcaseService[]
}

function formatCategoryName(type: string): string {
    return type
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

function groupByType(
    services: OrganizationShowcaseService[]
): Record<string, OrganizationShowcaseService[]> {
    const grouped: Record<string, OrganizationShowcaseService[]> = {}
    for (const service of services) {
        if (!grouped[service.type]) {
            grouped[service.type] = []
        }
        grouped[service.type].push(service)
    }
    return grouped
}

export function OrganizationShowcaseServices({ services }: OrganizationShowcaseServicesProps) {
    const { t } = useTranslation("organization-showcase")

    if (services.length === 0) return null

    const servicesByType = groupByType(services)
    const types = Object.keys(servicesByType)

    return (
        <section>
            <h2 className="font-semibold text-[20px] text-ds-fg">{t("services.title")}</h2>

            <div className="mt-6 space-y-6">
                {types.map((type) => (
                    <div key={type}>
                        {types.length > 1 && (
                            <p className="mb-2 font-semibold text-[16px] text-ds-fg">
                                {formatCategoryName(type)}
                            </p>
                        )}
                        <ul className="ml-2 space-y-3">
                            {servicesByType[type].map((service) => (
                                <li
                                    key={service.id}
                                    className="flex items-center gap-3 text-[16px] text-ds-fg"
                                >
                                    <span className="min-h-[5px] min-w-[5px] shrink-0 rounded-full bg-ds-fg" />
                                    {service.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    )
}
