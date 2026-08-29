import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckIcon, ChevronRightIcon } from "lucide-react"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
    return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
    return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
    className,
    sideOffset = 8,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                className={cn(
                    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[12rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto overflow-x-hidden rounded-lg bg-ds-surface p-1.5 text-ds-fg shadow-[var(--shadow-dropdown)] data-[state=closed]:animate-out data-[state=open]:animate-in",
                    className
                )}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    )
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
    return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

const dropdownMenuItemVariants = cva(
    "data-[variant=destructive]:*:[svg]:!text-ds-danger-text relative flex cursor-default select-none items-center gap-2 rounded-md text-ds-fg-muted text-sm outline-hidden hover:bg-ds-surface-hover hover:text-ds-fg focus:bg-ds-surface-hover focus:text-ds-fg data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[variant=destructive]:text-ds-danger-text data-[disabled]:opacity-50 data-[variant=destructive]:focus:bg-ds-danger-soft data-[variant=destructive]:focus:text-ds-danger-text [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-ds-fg-muted hover:[&_svg:not([class*='text-'])]:text-ds-fg focus:[&_svg:not([class*='text-'])]:text-ds-fg [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            size: {
                default: "px-2 py-2.5",
                sm: "h-9 px-2 py-0",
                xs: "h-8 px-2 py-0",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

const dropdownMenuChoiceItemVariants = cva(
    "relative flex cursor-default select-none items-center gap-2 rounded-md pr-8 pl-2 text-ds-fg-muted text-sm outline-hidden hover:bg-ds-surface-hover hover:text-ds-fg focus:bg-ds-surface-hover focus:text-ds-fg data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-ds-fg-muted hover:[&_svg:not([class*='text-'])]:text-ds-fg focus:[&_svg:not([class*='text-'])]:text-ds-fg [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            size: {
                default: "py-1.5",
                sm: "h-9 py-0",
                xs: "h-8 py-0",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

const dropdownMenuSubTriggerVariants = cva(
    "flex cursor-default select-none items-center gap-2 rounded-md px-2 text-ds-fg-muted text-sm outline-hidden hover:bg-ds-surface-hover hover:text-ds-fg focus:bg-ds-surface-hover focus:text-ds-fg data-[state=open]:bg-ds-surface-hover data-[inset]:pl-8 data-[state=open]:text-ds-fg [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-ds-fg-muted hover:[&_svg:not([class*='text-'])]:text-ds-fg focus:[&_svg:not([class*='text-'])]:text-ds-fg data-[state=open]:[&_svg:not([class*='text-'])]:text-ds-fg [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            size: {
                default: "py-2.5",
                sm: "h-9 py-0",
                xs: "h-8 py-0",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

function DropdownMenuItem({
    className,
    inset,
    size,
    variant = "default",
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
    variant?: "default" | "secondary" | "destructive"
} & VariantProps<typeof dropdownMenuItemVariants>) {
    return (
        <DropdownMenuPrimitive.Item
            data-slot="dropdown-menu-item"
            data-inset={inset}
            data-variant={variant}
            className={cn(dropdownMenuItemVariants({ size }), className)}
            {...props}
        />
    )
}

function DropdownMenuCheckboxItem({
    className,
    children,
    checked,
    size,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> &
    VariantProps<typeof dropdownMenuChoiceItemVariants>) {
    return (
        <DropdownMenuPrimitive.CheckboxItem
            data-slot="dropdown-menu-checkbox-item"
            className={cn(dropdownMenuChoiceItemVariants({ size }), className)}
            checked={checked}
            {...props}
        >
            <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
                <DropdownMenuPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                </DropdownMenuPrimitive.ItemIndicator>
            </span>
            {children}
        </DropdownMenuPrimitive.CheckboxItem>
    )
}

function DropdownMenuRadioGroup({
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
    return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownMenuRadioItem({
    className,
    children,
    size,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> &
    VariantProps<typeof dropdownMenuChoiceItemVariants>) {
    return (
        <DropdownMenuPrimitive.RadioItem
            data-slot="dropdown-menu-radio-item"
            className={cn(dropdownMenuChoiceItemVariants({ size }), className)}
            {...props}
        >
            <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
                <DropdownMenuPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                </DropdownMenuPrimitive.ItemIndicator>
            </span>
            {children}
        </DropdownMenuPrimitive.RadioItem>
    )
}

function DropdownMenuLabel({
    className,
    inset,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
}) {
    return (
        <DropdownMenuPrimitive.Label
            data-slot="dropdown-menu-label"
            data-inset={inset}
            className={cn("px-2 py-1.5 font-medium text-sm data-[inset]:pl-8", className)}
            {...props}
        />
    )
}

function DropdownMenuSeparator({
    className,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
    return (
        <DropdownMenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn("-mx-2 my-2 h-px bg-ds-surface-border", className)}
            {...props}
        />
    )
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            data-slot="dropdown-menu-shortcut"
            className={cn("ml-auto text-ds-fg-muted text-xs tracking-widest", className)}
            {...props}
        />
    )
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
    return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
    className,
    inset,
    children,
    size,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
} & VariantProps<typeof dropdownMenuSubTriggerVariants>) {
    return (
        <DropdownMenuPrimitive.SubTrigger
            data-slot="dropdown-menu-sub-trigger"
            data-inset={inset}
            className={cn(dropdownMenuSubTriggerVariants({ size }), className)}
            {...props}
        >
            {children}
            <ChevronRightIcon className="ml-auto size-4" />
        </DropdownMenuPrimitive.SubTrigger>
    )
}

function DropdownMenuSubContent({
    className,
    ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
    return (
        <DropdownMenuPrimitive.SubContent
            data-slot="dropdown-menu-sub-content"
            className={cn(
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-lg bg-ds-surface p-2 text-ds-fg shadow-[var(--shadow-dropdown)] data-[state=closed]:animate-out data-[state=open]:animate-in",
                className
            )}
            {...props}
        />
    )
}

export {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
}
