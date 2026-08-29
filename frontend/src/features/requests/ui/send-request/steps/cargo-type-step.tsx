import type React from "react"
import { useImperativeHandle, useState } from "react"
import { CategorySelectionGrid } from "@/entities/service-type"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { FieldError } from "@/shared/ui/field"
import type { Category, StepRef } from "../../../model/request"
import { cargoTypeSchema } from "../../../model/schemas/send-request.schema"
import { useSendRequestStore } from "../../../model/use-send-request.store"

interface CargoTypeStepProps {
    categories: Category[]
    isLoading: boolean
}

export function CargoTypeStep({
    categories,
    isLoading,
    ref,
}: CargoTypeStepProps & { ref?: React.Ref<StepRef> }) {
    const { data, updateData } = useSendRequestStore()
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
        validate: () => {
            const result = safeParseSchema(cargoTypeSchema, {
                selectedCategories: data.selectedCategories ?? [],
            })

            if (result.success) {
                setError(null)
                return Promise.resolve(true)
            }

            setError(result.error.issues[0]?.message ?? "Invalid selection")
            return Promise.resolve(false)
        },
    }))

    const toggleCategory = (categoryId: string, checked: boolean) => {
        const current = data.selectedCategories ?? []
        const updated = checked
            ? [...new Set([...current, categoryId])]
            : current.filter((id) => id !== categoryId)

        updateData({ selectedCategories: updated })
        if (error) setError(null)
    }

    const selectedCategoryIds = new Set(data.selectedCategories ?? [])

    return (
        <CategorySelectionGrid
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            isLoading={isLoading}
            onCategoryChange={toggleCategory}
            feedback={error ? <FieldError>{error}</FieldError> : null}
        />
    )
}
