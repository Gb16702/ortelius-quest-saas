import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
    return (
        <CommandPrimitive
            className={cn(
                "flex h-full w-full flex-col overflow-hidden rounded-sm bg-ds-surface text-ds-fg",
                className
            )}
            {...props}
        />
    )
}

function CommandInput({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
    return (
        <div className="flex items-center border-ds-surface-border border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-ds-fg-muted" />
            <CommandPrimitive.Input
                className={cn(
                    "flex h-11 w-full rounded-sm bg-transparent py-3 text-sm outline-hidden placeholder:text-ds-fg-muted disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            />
        </div>
    )
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
    return (
        <CommandPrimitive.List
            className={cn("max-h-[420px] overflow-y-auto overflow-x-hidden", className)}
            {...props}
        />
    )
}

function CommandEmpty({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
    return (
        <CommandPrimitive.Empty
            className={cn("py-6 text-center text-ds-fg-muted text-sm", className)}
            {...props}
        />
    )
}

function CommandGroup({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
    return (
        <CommandPrimitive.Group
            className={cn(
                "overflow-hidden p-1 text-ds-fg [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ds-fg-muted [&_[cmdk-group-heading]]:text-xs",
                className
            )}
            {...props}
        />
    )
}

function CommandSeparator({
    className,
    ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
    return (
        <CommandPrimitive.Separator
            className={cn("-mx-1 h-px bg-ds-surface-border", className)}
            {...props}
        />
    )
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
    return (
        <CommandPrimitive.Item
            className={cn(
                "hover:!bg-ds-surface-interactive relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-ds-surface-interactive data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
                className
            )}
            {...props}
        />
    )
}

function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
    return (
        <span
            className={cn("ml-auto text-ds-fg-muted text-xs tracking-widest", className)}
            {...props}
        />
    )
}

export {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
}
