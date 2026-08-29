import type { ReactNode } from "react"
import { Stack } from "@/shared/ui/stack"

interface BillingSettingsSectionProps {
    title: string
    description?: string
    children: ReactNode
}

export function BillingSettingsSection({
    title,
    description,
    children,
}: BillingSettingsSectionProps) {
    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="font-medium text-base text-ds-fg leading-none">{title}</h2>
                {description ? (
                    <p className="text-ds-fg-muted text-sm leading-normal">{description}</p>
                ) : null}
            </div>
            <Stack>{children}</Stack>
        </section>
    )
}
