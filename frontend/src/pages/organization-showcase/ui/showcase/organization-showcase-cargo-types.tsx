import { useTranslation } from "react-i18next"
import type { OrganizationShowcaseCargoType } from "@/entities/organization"

interface OrganizationShowcaseCargoTypesProps {
    cargoTypes: OrganizationShowcaseCargoType[]
}

export function OrganizationShowcaseCargoTypes({
    cargoTypes,
}: OrganizationShowcaseCargoTypesProps) {
    const { t } = useTranslation("organization-showcase")

    if (cargoTypes.length === 0) return null

    const sorted = [...cargoTypes].sort((a, b) => a.name.localeCompare(b.name))

    return (
        <section>
            <h2 className="font-semibold text-ds-fg text-xl">{t("cargoTypes.title")}</h2>

            <div className="mt-4 flex flex-wrap gap-2">
                {sorted.map((cargoType) => (
                    <span
                        key={cargoType.id}
                        className="rounded-full border border-ds-surface-border bg-ds-surface px-3 py-1.5 text-ds-fg text-sm"
                    >
                        {cargoType.name}
                    </span>
                ))}
            </div>
        </section>
    )
}
