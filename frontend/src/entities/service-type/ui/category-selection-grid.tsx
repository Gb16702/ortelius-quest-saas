import { Search } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { FieldLegend, FieldSet } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { SelectableCard } from "@/shared/ui/selectable-card"
import { Skeleton } from "@/shared/ui/skeleton"
import { CategoryIcon } from "./category-icon"

const CATEGORY_SKELETON_KEYS = [
    "category-skeleton-1",
    "category-skeleton-2",
    "category-skeleton-3",
    "category-skeleton-4",
    "category-skeleton-5",
    "category-skeleton-6",
]

interface CategorySelectionItem {
    id: string
    name: string
    slug: string
}

interface CategorySelectionGridProps {
    categories: CategorySelectionItem[]
    selectedCategoryIds: ReadonlySet<string>
    isLoading: boolean
    onCategoryChange: (categoryId: string, checked: boolean) => void
    feedback?: React.ReactNode
    legend?: string
}

export function CategorySelectionGrid({
    categories,
    selectedCategoryIds,
    isLoading,
    onCategoryChange,
    feedback,
    legend = "Cargo types",
}: CategorySelectionGridProps) {
    const [search, setSearch] = useState("")

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value)
    }

    if (isLoading) {
        return (
            <div className="flex w-full flex-col gap-y-3">
                <Skeleton className="h-10 w-full rounded-sm" />
                <div className="grid grid-cols-3 gap-3">
                    {CATEGORY_SKELETON_KEYS.map((key) => (
                        <div
                            key={key}
                            className="flex flex-col items-center gap-1 rounded-sm border border-ds-surface-border bg-ds-surface p-3"
                        >
                            <Skeleton className="h-4 w-4 self-end rounded-xs" />
                            <Skeleton className="h-8 w-8 rounded-sm" />
                            <Skeleton className="mt-1 h-3 w-16 rounded-xs" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const lowerSearch = search.toLowerCase()
    const filteredCategories = categories.filter((category) =>
        category.name.toLowerCase().includes(lowerSearch)
    )

    return (
        <FieldSet className="gap-y-3">
            <FieldLegend className="sr-only" variant="label">
                {legend}
            </FieldLegend>
            <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                <Input
                    type="text"
                    size="sm"
                    placeholder="Search categories..."
                    value={search}
                    onChange={handleSearchChange}
                    className="w-full pl-10"
                />
            </div>
            <div className="grid grid-cols-3 gap-3">
                {filteredCategories.map((category) => (
                    <SelectableCard
                        key={category.id}
                        id={category.id}
                        name={category.name}
                        layout="stacked"
                        size="sm"
                        icon={<CategoryIcon slug={category.slug} />}
                        checked={selectedCategoryIds.has(category.id)}
                        onChange={onCategoryChange}
                    />
                ))}
            </div>
            {feedback}
            {filteredCategories.length === 0 && (
                <p className="py-4 text-center text-ds-fg-muted text-sm">No categories found</p>
            )}
        </FieldSet>
    )
}
