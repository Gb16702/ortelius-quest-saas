import { Link } from "@tanstack/react-router"
import { Check, ChevronRight, Circle, CircleDashed, X } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    getCompletionCount,
    getSetupSteps,
    isOrganizationFullySetUp,
    type OrganizationSetupStatus,
    type SetupStep,
} from "@/entities/organization"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import { CircularProgress } from "@/shared/ui/circular-progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"

type SidebarSetupNavigationIntent = (
    href: string,
    trigger: "click" | "focus" | "hover",
    label: string
) => void

interface OrgSidebarSetupChecklistProps {
    status: OrganizationSetupStatus
    organizationSlug: string
    onNavigationIntent?: SidebarSetupNavigationIntent
}

export function OrgSidebarSetupChecklist({
    status,
    organizationSlug,
    onNavigationIntent,
}: OrgSidebarSetupChecklistProps) {
    const { t } = useTranslation("workspace")
    const [open, setOpen] = useState(false)
    const steps = useMemo(() => getSetupSteps(status, organizationSlug), [status, organizationSlug])
    const sortedSteps = useMemo(
        () => [...steps].sort((a, b) => Number(b.isComplete) - Number(a.isComplete)),
        [steps]
    )
    const firstIncompleteStep = steps.find((step) => !step.isComplete)
    const { completed, total } = getCompletionCount(status)

    if (isOrganizationFullySetUp(status) && status.memberCount > 1) {
        return null
    }

    const title = t("sidebar.setupChecklist.title", { defaultValue: "Getting started" })
    const stepsCompletedLabel = t("sidebar.setupChecklist.stepsCompleted", {
        defaultValue: "{{completed}}/{{total}} steps completed",
        completed,
        total,
    })

    const recordIntent = (
        step: SetupStep,
        trigger: "click" | "focus" | "hover",
        label = step.title
    ) => {
        onNavigationIntent?.(step.href, trigger, label)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={t("sidebar.setupChecklist.open", {
                        defaultValue: "Open getting started checklist",
                    })}
                    className="group flex h-10 w-full items-center gap-3 rounded-lg bg-ds-fg px-3 text-ds-surface shadow-[0_1px_1px_rgba(0,0,0,0.14),0_6px_18px_rgba(0,0,0,0.12)] outline-none transition-colors hover:bg-ds-gray-1000 focus-visible:ring-2 focus-visible:ring-ds-sidebar-ring/40"
                >
                    <CircularProgress
                        value={completed}
                        max={total}
                        size={16}
                        strokeWidth={2.4}
                        className="shrink-0 text-ds-surface [&_circle:first-child]:text-ds-gray-800 [&_circle:last-child]:text-ds-surface"
                    />
                    <span className="min-w-0 flex-1 truncate text-left font-medium text-sm">
                        {title}
                    </span>
                    <ChevronRight
                        className={cn(
                            "size-4 shrink-0 transition-transform duration-150",
                            open && "rotate-90"
                        )}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="right"
                align="end"
                sideOffset={10}
                className="w-[min(360px,calc(100vw-2rem))] overflow-hidden p-0 shadow-dropdown"
            >
                <div className="relative p-4 pb-3">
                    <div className="flex flex-col items-start gap-3 pr-8">
                        <CircularProgress
                            value={completed}
                            max={total}
                            size={20}
                            strokeWidth={2.8}
                            className="shrink-0 text-ds-accent-text"
                        />
                        <div className="min-w-0">
                            <h3 className="font-semibold text-base text-ds-fg leading-6">
                                {title}
                            </h3>
                            <p className="mt-0.5 text-ds-fg-muted text-sm">{stepsCompletedLabel}</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("sidebar.setupChecklist.close", {
                            defaultValue: "Close getting started checklist",
                        })}
                        onClick={() => setOpen(false)}
                        className="absolute top-3 right-3 shrink-0"
                    >
                        <X className="size-4" />
                    </Button>
                </div>

                <ul className="flex max-h-[320px] flex-col gap-1 overflow-y-auto px-2 pb-2">
                    {sortedSteps.map((step) => (
                        <OrgSidebarSetupChecklistStep
                            key={step.id}
                            step={step}
                            isCurrent={step.id === firstIncompleteStep?.id}
                            onClose={() => setOpen(false)}
                            onNavigationIntent={recordIntent}
                        />
                    ))}
                </ul>

                {firstIncompleteStep && (
                    <div className="px-2 pt-2 pb-2">
                        <Link
                            to={firstIncompleteStep.href}
                            onClick={() => {
                                setOpen(false)
                                recordIntent(
                                    firstIncompleteStep,
                                    "click",
                                    "Getting started continue"
                                )
                            }}
                            onFocus={() =>
                                recordIntent(
                                    firstIncompleteStep,
                                    "focus",
                                    "Getting started continue"
                                )
                            }
                            onPointerEnter={() =>
                                recordIntent(
                                    firstIncompleteStep,
                                    "hover",
                                    "Getting started continue"
                                )
                            }
                            className="flex h-9 items-center justify-center rounded-full bg-ds-accent px-3 font-medium text-ds-surface text-sm outline-none transition-colors hover:bg-ds-accent-hover focus-visible:ring-2 focus-visible:ring-ds-accent-ring/40"
                        >
                            {t("sidebar.setupChecklist.continue", {
                                defaultValue: "Continue setup",
                            })}
                        </Link>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

interface OrgSidebarSetupChecklistStepProps {
    step: SetupStep
    isCurrent: boolean
    onClose: () => void
    onNavigationIntent: (
        step: SetupStep,
        trigger: "click" | "focus" | "hover",
        label?: string
    ) => void
}

function OrgSidebarSetupChecklistStep({
    step,
    isCurrent,
    onClose,
    onNavigationIntent,
}: OrgSidebarSetupChecklistStepProps) {
    const icon = step.isComplete ? (
        <span className="grid size-5 shrink-0 place-content-center rounded-full bg-ds-accent text-ds-surface">
            <Check className="size-3.5" />
        </span>
    ) : isCurrent ? (
        <CircleDashed className="size-5 shrink-0 text-ds-accent-text" />
    ) : (
        <Circle className="size-5 shrink-0 text-ds-fg-muted" />
    )

    const content = (
        <>
            <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className={cn("block truncate font-medium text-sm leading-5")}>
                    {step.title}
                </span>
            </span>
            {!step.isComplete && <ChevronRight className="size-4 shrink-0 text-ds-fg-muted" />}
        </>
    )

    const className = cn(
        "flex h-9 items-center gap-3 rounded-md px-3 text-left outline-none transition-colors",
        isCurrent && "bg-ds-accent-muted",
        !step.isComplete &&
            "hover:bg-ds-surface-hover focus-visible:ring-2 focus-visible:ring-ds-sidebar-ring/40"
    )

    if (step.isComplete) {
        return <li className={className}>{content}</li>
    }

    return (
        <li>
            <Link
                to={step.href}
                className={className}
                onClick={() => {
                    onClose()
                    onNavigationIntent(step, "click", step.title)
                }}
                onFocus={() => onNavigationIntent(step, "focus", step.title)}
                onPointerEnter={() => onNavigationIntent(step, "hover", step.title)}
            >
                {content}
            </Link>
        </li>
    )
}
