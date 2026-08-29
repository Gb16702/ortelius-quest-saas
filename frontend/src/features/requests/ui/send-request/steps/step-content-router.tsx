import type React from "react"
import { useCategories, useServices } from "../../../api/send-request.queries"
import type { StepRef } from "../../../model/request"
import { CargoTypeStep } from "./cargo-type-step"
import { ContactInformationStep } from "./contact-information-step"
import { DetailsStep } from "./details-step"
import { ServicesStep } from "./services-step"

interface StepContentRouterProps {
    step: number
    currentStep: number
    organizationId: string | null
    ref?: React.Ref<StepRef>
}

export function StepContentRouter({
    step,
    currentStep,
    organizationId,
    ref,
}: StepContentRouterProps) {
    const { data: categories = [], isLoading: isCategoriesLoading } = useCategories(
        organizationId,
        currentStep >= 2
    )

    const {
        data: orderedServicesByType = {
            cargo: [],
            storage: [],
            logistics: [],
            port: [],
        },
        isLoading: isServicesLoading,
    } = useServices(organizationId, currentStep >= 3)

    switch (step) {
        case 1:
            return <ContactInformationStep ref={ref} />

        case 2:
            return (
                <CargoTypeStep ref={ref} categories={categories} isLoading={isCategoriesLoading} />
            )

        case 3:
            return (
                <ServicesStep
                    ref={ref}
                    orderedServicesByType={orderedServicesByType}
                    isLoading={isServicesLoading}
                />
            )

        case 4:
            return <DetailsStep />

        default:
            return null
    }
}
