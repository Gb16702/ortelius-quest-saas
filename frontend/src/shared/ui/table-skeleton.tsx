import { cn } from "@/shared/lib/class-names"
import { Skeleton } from "./skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

export type SkeletonCellType =
    | "avatar-name"
    | "badge"
    | "text-short"
    | "text-medium"
    | "text-long"
    | "number"
    | "date"
    | "actions"
    | "empty"

export interface SkeletonCellConfig {
    type: SkeletonCellType
    width?: string
    align?: "left" | "center" | "right"
}

export interface TableSkeletonConfig {
    name: string
    columns: SkeletonCellConfig[]
    defaultRows?: number
    className?: string
}

export interface TableSkeletonProps {
    config: TableSkeletonConfig
    rows?: number
    className?: string
}

interface TableSkeletonCellProps {
    type: SkeletonCellType
    width?: string
    align?: "left" | "center" | "right"
}

const SkeletonCell = ({ type, width, align = "left" }: TableSkeletonCellProps) => {
    const alignClass = {
        left: "justify-start",
        center: "justify-center",
        right: "justify-end",
    }[align]

    const renderCellContent = (type: SkeletonCellType) => {
        switch (type) {
            case "avatar-name":
                return (
                    <div className="flex items-center space-x-3">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                )

            case "badge":
                return <Skeleton className="h-6 w-20 rounded-full" />

            case "text-short":
                return <Skeleton className="h-4 w-16" />

            case "text-medium":
                return <Skeleton className="h-4 w-32" />

            case "text-long":
                return <Skeleton className="h-4 w-48" />

            case "number":
                return <Skeleton className="h-4 w-20" />

            case "date":
                return <Skeleton className="h-4 w-24" />

            case "actions":
                return (
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-8 w-8 rounded" />
                    </div>
                )
            default:
                return <Skeleton className="h-4 w-12" />
        }
    }

    return (
        <TableCell className={cn("py-4", alignClass)} style={{ width }}>
            <div className={cn("flex", alignClass)}>{renderCellContent(type)}</div>
        </TableCell>
    )
}

export const TableSkeleton = ({
    config,
    rows = config.defaultRows || 5,
    className,
}: TableSkeletonProps) => {
    return (
        <div className={cn("rounded-md border", className, config.className)}>
            <Table>
                <TableHeader>
                    <TableRow>
                        {config.columns.map((column, index) => (
                            <TableHead
                                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder, no item identity
                                key={index}
                                style={{ width: column.width }}
                            >
                                <Skeleton className="h-4 w-20" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }, (_, rowIndex) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder, no item identity
                        <TableRow key={rowIndex}>
                            {config.columns.map((column, columnIndex) => (
                                <SkeletonCell
                                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder, no item identity
                                    key={`${rowIndex}-${columnIndex}`}
                                    type={column.type}
                                    width={column.width}
                                    align={column.align}
                                />
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
