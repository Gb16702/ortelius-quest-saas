import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"

interface PageSizeSelectorProps {
    currentPageSize: number
    onPageSizeChange: (pageSize: number) => void
    options?: number[]
    className?: string
    showLabel?: boolean
    disabled?: boolean
}

export const PageSizeSelector = ({
    currentPageSize,
    onPageSizeChange,
    options = [5, 10, 15, 20],
    className = "",
    showLabel = false,
    disabled = false,
}: PageSizeSelectorProps) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {showLabel && <span className="text-ds-fg-muted text-sm">Show</span>}
            <Select
                value={currentPageSize.toString()}
                onValueChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}
                disabled={disabled}
            >
                <SelectTrigger size={"sm"} className="h-6 w-fit text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent align={"end"}>
                    {options.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {showLabel && <span className="text-ds-fg-muted text-sm">entries</span>}
        </div>
    )
}
