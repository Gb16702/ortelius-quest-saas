import { Link } from "@tanstack/react-router"
import { ChevronRight, CircleCheck, CircleDashed } from "lucide-react"
import { cn } from "@/shared/lib/class-names"
import { CircularProgress } from "@/shared/ui/circular-progress"
import {
    getCompletionCount,
    getSetupSteps,
    isOrganizationFullySetUp,
    type OrganizationSetupStatus,
} from "../model/organization-setup"

interface OrganizationSetupChecklistProps {
    status: OrganizationSetupStatus
    organizationSlug: string
    className?: string
}

export function OrganizationSetupChecklist({
    status,
    organizationSlug,
    className,
}: OrganizationSetupChecklistProps) {
    const steps = getSetupSteps(status, organizationSlug)
    const sortedSteps = [...steps].sort((a, b) => {
        if (a.isComplete === b.isComplete) return 0
        return a.isComplete ? 1 : -1
    })
    const { completed, total } = getCompletionCount(status)

    if (isOrganizationFullySetUp(status) && status.memberCount > 1) {
        return null
    }

    return (
        <div
            className={cn(
                "overflow-hidden rounded-md border border-ds-surface-border bg-ds-surface",
                className
            )}
        >
            <div className="flex items-center justify-between gap-4 border-ds-surface-border border-b p-6">
                <div>
                    <h3 className="font-semibold text-base text-ds-fg">
                        Complete your organization setup
                    </h3>
                    <p className="mt-1 text-sm">
                        Use this personalized guide to get your organization up and running.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <CircularProgress value={completed} max={total} size={16} strokeWidth={2} />
                    <span className="whitespace-nowrap text-sm">
                        {completed} of {total} steps completed
                    </span>
                </div>
            </div>

            <div className="divide-y divide-ds-surface-border">
                {sortedSteps.map((step) => {
                    const content = (
                        <>
                            <div className="flex size-5.5 flex-shrink-0 items-center justify-center rounded-full">
                                {step.isComplete ? (
                                    <CircleCheck className="size-5 stroke-[1.3px] text-ds-fg-muted" />
                                ) : (
                                    <CircleDashed className="size-5 stroke-[1.5px]" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p
                                    className={cn(
                                        "font-medium text-sm",
                                        step.isComplete && "text-ds-fg-muted line-through"
                                    )}
                                >
                                    {step.title}
                                </p>
                                <p
                                    className={cn(
                                        "mt-0.5 truncate text-sm",
                                        step.isComplete && "text-ds-fg-muted"
                                    )}
                                >
                                    {step.description}
                                </p>
                            </div>

                            {!step.isComplete && <ChevronRight className="size-5 stroke-[1.5px]" />}
                        </>
                    )

                    const className = cn(
                        "flex items-center gap-4 px-6 py-4 transition-colors",
                        !step.isComplete && "hover:bg-ds-surface-hover"
                    )

                    if (step.isComplete) {
                        return (
                            <div key={step.id} className={className}>
                                {content}
                            </div>
                        )
                    }

                    return (
                        <Link key={step.id} to={step.href} className={className}>
                            {content}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
