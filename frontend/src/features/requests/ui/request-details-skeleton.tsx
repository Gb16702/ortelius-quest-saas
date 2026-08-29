import { Skeleton } from "@/shared/ui/skeleton"

export const RequestDetailsSkeleton = () => {
    return (
        <div className="space-y-10">
            <div className="flex items-start gap-4">
                <Skeleton className="h-[130px] w-[130px] rounded-md" />
                <div className="flex-1 space-y-4">
                    <Skeleton className="h-6 w-2/4" />
                    <Skeleton className="h-4 w-1/12" />
                </div>
            </div>
            <div className={"space-y-4"}>
                <div className="grid grid-cols-4 gap-4">
                    <Skeleton className="h-28 w-full rounded-md" />
                    <Skeleton className="h-28 w-full rounded-md" />
                    <Skeleton className="h-28 w-full rounded-md" />
                    <Skeleton className="h-28 w-full rounded-md" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-md" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-md" />
            </div>
        </div>
    )
}
