import type React from "react"
import { useImperativeHandle, useState } from "react"
import { ServiceSelectionGroups } from "@/entities/service-type"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { FieldError } from "@/shared/ui/field"
import type { Service, StepRef } from "../../../model/request"
import { servicesSchema } from "../../../model/schemas/send-request.schema"
import { useSendRequestStore } from "../../../model/use-send-request.store"

interface ServicesStepProps {
    orderedServicesByType: {
        cargo: Service[]
        storage: Service[]
        logistics: Service[]
        port: Service[]
    }
    isLoading: boolean
}

export function ServicesStep({
    orderedServicesByType,
    isLoading,
    ref,
}: ServicesStepProps & { ref?: React.Ref<StepRef> }) {
    const { data, updateData } = useSendRequestStore()
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
        validate: () => {
            const result = safeParseSchema(servicesSchema, {
                selectedServices: data.selectedServices ?? [],
            })

            if (result.success) {
                setError(null)
                return Promise.resolve(true)
            }

            setError(result.error.issues[0]?.message ?? "Invalid selection")
            return Promise.resolve(false)
        },
    }))

    const toggleService = (serviceId: string, checked: boolean) => {
        const current = data.selectedServices ?? []
        const updated = checked
            ? [...new Set([...current, serviceId])]
            : current.filter((id) => id !== serviceId)

        updateData({ selectedServices: updated })
        if (error) setError(null)
    }

    const selectedServiceIds = new Set(data.selectedServices ?? [])

    return (
        <ServiceSelectionGroups
            servicesByType={orderedServicesByType}
            selectedServiceIds={selectedServiceIds}
            isLoading={isLoading}
            onServiceChange={toggleService}
            feedback={error ? <FieldError>{error}</FieldError> : null}
        />
    )
}
