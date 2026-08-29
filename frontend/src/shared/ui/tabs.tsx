import * as TabsPrimitive from "@radix-ui/react-tabs"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            className={cn("flex flex-col gap-2", className)}
            {...props}
        />
    )
}

interface TabsListProps extends React.ComponentProps<typeof TabsPrimitive.List> {
    variant?: "default" | "inverted"
}

function TabsList({ className, variant, ...props }: TabsListProps) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            data-variant={variant}
            className={cn(
                "data-[variant=default]:border data-[variant=default]:border-ds-surface-border data-[variant=default]:bg-ds-surface",
                "data-[variant=inverted]:border-0 data-[variant=inverted]:bg-ds-canvas",
                "inline-flex h-10 w-fit items-center justify-center rounded-sm border border-ds-surface-border bg-ds-surface p-1 text-ds-fg-muted",
                className
            )}
            {...props}
        />
    )
}

interface TabsTriggerProps extends React.ComponentProps<typeof TabsPrimitive.Trigger> {
    variant?: "default" | "inverted"
}

function TabsTrigger({ className, variant, ...props }: TabsTriggerProps) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            data-variant={variant}
            className={cn(
                "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xs border border-transparent px-4 py-1 font-medium text-ds-fg-muted text-sm transition-[color,box-shadow] focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-ds-surface-interactive data-[state=active]:text-ds-fg [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                "data-[variant=default]:data-[state=active]:bg-ds-surface-interactive",
                "data-[variant=inverted]:data-[state=active]:bg-ds-surface",
                className
            )}
            {...props}
        />
    )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn("flex-1 outline-none", className)}
            {...props}
        />
    )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
