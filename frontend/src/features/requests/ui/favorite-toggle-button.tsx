import { Star } from "lucide-react"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
    type FavoriteEntityType,
    type FavoriteItem,
    useFavorites,
    useFavoriteToggle,
} from "@/entities/favorite"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"

interface FavoriteToggleButtonProps {
    organizationId: string
    entityType: Extract<FavoriteEntityType, "request" | "quote" | "invoice">
    entityId: string
    optimisticFavorite: FavoriteItem
    className?: string
}

export function FavoriteToggleButton({
    organizationId,
    entityType,
    entityId,
    optimisticFavorite,
    className,
}: FavoriteToggleButtonProps) {
    const { t } = useTranslation("requests")
    const favoritesQuery = useFavorites(organizationId)
    const favoriteToggleMutation = useFavoriteToggle()
    const isFavorited = useMemo(
        () =>
            (favoritesQuery.data?.favorites ?? []).some(
                (favorite) => favorite.entityType === entityType && favorite.entityId === entityId
            ),
        [entityId, entityType, favoritesQuery.data?.favorites]
    )

    const label = isFavorited
        ? t("favorite.remove", { defaultValue: "Remove favorite" })
        : t("favorite.add", { defaultValue: "Add favorite" })

    const toggleFavorite = useCallback(() => {
        favoriteToggleMutation.mutate({
            entityType,
            entityId,
            isFavorited,
            organizationId,
            optimisticFavorite,
        })
    }, [
        entityId,
        entityType,
        favoriteToggleMutation,
        isFavorited,
        organizationId,
        optimisticFavorite,
    ])

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            radius="full"
            className={cn("size-8", className)}
            onClick={toggleFavorite}
            disabled={favoriteToggleMutation.isPending || favoritesQuery.isLoading}
            aria-label={label}
            title={label}
        >
            <Star
                className="size-4 text-ds-fg-muted"
                fill={isFavorited ? "currentColor" : "none"}
            />
        </Button>
    )
}
