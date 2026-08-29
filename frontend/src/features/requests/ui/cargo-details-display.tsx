import { Checkbox } from "@/shared/ui/checkbox"
import { FieldLabel } from "@/shared/ui/field"
import type { CargoDetails } from "../model/request"

interface CargoDetailsDisplayProps {
    cargoDetails: CargoDetails
    isEditMode?: boolean
    requestCargoDetails?: CargoDetails
    onCargoDetailChange?: (field: string, value: number | string | null) => void
    onDimensionChange?: (dimension: string, value: number | null) => void
    onOptionChange?: (option: string, value: boolean) => void
}

interface DetailItem {
    label: string
    value: string
    field?: string
    checked?: boolean
    originalValue?: number | string | boolean
    isOption?: boolean
    isDimension?: boolean
}

export function CargoDetailsDisplay({
    cargoDetails,
    isEditMode = false,
    requestCargoDetails,
    onCargoDetailChange,
    onDimensionChange,
    onOptionChange,
}: CargoDetailsDisplayProps) {
    const allDetails: DetailItem[] = [
        requestCargoDetails?.weight && {
            label: "Weight",
            value: `${requestCargoDetails.weight} kg`,
            field: "weight",
            checked: cargoDetails.weight !== null,
            originalValue: requestCargoDetails.weight,
        },
        requestCargoDetails?.volume && {
            label: "Volume",
            value: `${requestCargoDetails.volume} m³`,
            field: "volume",
            checked: cargoDetails.volume !== null,
            originalValue: requestCargoDetails.volume,
        },
        requestCargoDetails?.palletCount && {
            label: "Pallet Count",
            value: requestCargoDetails.palletCount.toString(),
            field: "palletCount",
            checked: cargoDetails.palletCount !== null,
            originalValue: requestCargoDetails.palletCount,
        },
        requestCargoDetails?.dimensions?.length && {
            label: "Length",
            value: `${requestCargoDetails.dimensions.length} m`,
            field: "length",
            checked: cargoDetails.dimensions?.length !== null,
            originalValue: requestCargoDetails.dimensions.length,
            isDimension: true,
        },
        requestCargoDetails?.dimensions?.width && {
            label: "Width",
            value: `${requestCargoDetails.dimensions.width} m`,
            field: "width",
            checked: cargoDetails.dimensions?.width !== null,
            originalValue: requestCargoDetails.dimensions.width,
            isDimension: true,
        },
        requestCargoDetails?.dimensions?.height && {
            label: "Height",
            value: `${requestCargoDetails.dimensions.height} m`,
            field: "height",
            checked: cargoDetails.dimensions?.height !== null,
            originalValue: requestCargoDetails.dimensions.height,
            isDimension: true,
        },
        requestCargoDetails?.fragility && {
            label: "Fragility",
            value: requestCargoDetails.fragility,
            field: "fragility",
            checked: cargoDetails.fragility !== null,
            originalValue: requestCargoDetails.fragility,
        },
        requestCargoDetails?.options?.hazardous && {
            label: "Hazardous",
            value: "Yes",
            field: "hazardous",
            checked: cargoDetails.options?.hazardous,
            isOption: true,
        },
        requestCargoDetails?.options?.insuranceCoverage && {
            label: "Insurance",
            value: "Yes",
            field: "insuranceCoverage",
            checked: cargoDetails.options?.insuranceCoverage,
            isOption: true,
        },
        requestCargoDetails?.options?.perishableGoods && {
            label: "Perishable",
            value: "Yes",
            field: "perishableGoods",
            checked: cargoDetails.options?.perishableGoods,
            isOption: true,
        },
    ].filter(Boolean) as DetailItem[]

    if (allDetails.length === 0) {
        return null
    }

    const totalItems = allDetails.length
    const numRows = Math.ceil(totalItems / 3)

    const onDetailChange = (detail: DetailItem, checked: boolean) => {
        if (detail.isOption && onOptionChange && detail.field) {
            onOptionChange(detail.field, checked)
        } else if (detail.isDimension && onDimensionChange && detail.field) {
            onDimensionChange(detail.field, checked ? (detail.originalValue as number) : null)
        } else if (onCargoDetailChange && detail.field) {
            const value = detail.originalValue
            const numericOrString = typeof value === "boolean" ? null : (value ?? null)
            onCargoDetailChange(detail.field, checked ? numericOrString : null)
        }
    }

    return (
        <div
            className="grid grid-flow-col grid-cols-3"
            style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
        >
            {allDetails.map((detail, index) => {
                const column = Math.floor(index / numRows)
                const needsRightBorder = column < 2

                if (isEditMode) {
                    return (
                        <div
                            key={detail.label}
                            className={`flex items-center justify-between gap-2 p-4 text-sm ${
                                needsRightBorder ? "border-ds-surface-border border-r" : ""
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={detail.field}
                                    checked={detail.checked}
                                    onCheckedChange={(checked) =>
                                        onDetailChange(detail, checked as boolean)
                                    }
                                />
                                <FieldLabel
                                    htmlFor={detail.field}
                                    className={`cursor-pointer text-ds-fg-muted text-sm ${
                                        !detail.checked ? "line-through" : ""
                                    }`}
                                >
                                    {detail.label}
                                </FieldLabel>
                            </div>
                            <span
                                className={`text-ds-fg capitalize ${
                                    !detail.checked ? "text-ds-fg-muted line-through" : ""
                                }`}
                            >
                                {detail.value.includes(":")
                                    ? detail.value.split(":")[1].trim()
                                    : detail.value}
                            </span>
                        </div>
                    )
                }

                return (
                    <div
                        key={detail.label}
                        className={`flex justify-between gap-1 p-4 text-sm ${
                            needsRightBorder ? "border-ds-surface-border border-r" : ""
                        }`}
                    >
                        <span className="text-ds-fg-muted">{detail.label}</span>
                        <span className="text-ds-fg capitalize">{detail.value}</span>
                    </div>
                )
            })}
        </div>
    )
}
