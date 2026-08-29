import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import { type FieldControlSize, fieldControlHeightVariants } from "@/shared/ui/field-control-shape"
import { Input } from "@/shared/ui/input"
import { Textarea } from "@/shared/ui/textarea"

function InputGroup({
    className,
    size = "default",
    ...props
}: React.ComponentProps<"div"> & {
    size?: FieldControlSize
}) {
    return (
        // biome-ignore lint/a11y/useSemanticElements: role chosen intentionally; semantic-element refactor pending
        <div
            data-slot="input-group"
            data-size={size}
            role="group"
            className={cn(
                "group/input-group relative flex w-full items-center rounded-sm border border-ds-control-border bg-ds-surface outline-none transition-[color,border-color,background-color]",
                "min-w-0 has-[>textarea]:h-auto",
                fieldControlHeightVariants[size],
                "has-[>[data-align=inline-start]]:[&>input]:pl-2",
                "has-[>[data-align=inline-end]]:[&>input]:pr-2",
                "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
                "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",

                "hover:has-[[data-slot=input-group-control]:not(:focus-visible)]:border-ds-control-border-hover",

                "has-[[data-slot=input-group-control]:focus-visible]:border-ds-control-border-focus has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ds-gray-alpha-300",

                "has-[[data-slot][aria-invalid=true]]:border-ds-control-border-invalid has-[[data-slot][aria-invalid=true]]:ring-ds-control-ring-invalid has-[[data-slot][aria-invalid=true]]:hover:border-ds-control-border-invalid-hover",

                className
            )}
            {...props}
        />
    )
}

const inputGroupAddonVariants = cva(
    "flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 font-medium text-ds-fg-muted text-sm group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-xs [&>svg:not([class*='size-'])]:size-4",
    {
        variants: {
            align: {
                "inline-start":
                    "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
                "inline-end":
                    "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
                "block-start":
                    "order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3",
                "block-end":
                    "order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3",
            },
        },
        defaultVariants: {
            align: "inline-start",
        },
    }
)

function InputGroupAddon({
    className,
    align = "inline-start",
    ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
    return (
        // biome-ignore lint/a11y/useSemanticElements: role chosen intentionally; semantic-element refactor pending
        // biome-ignore lint/a11y/useKeyWithClickEvents: non-keyboard handler intentional; nested control or interactive parent owns keyboard handling
        <div
            role="group"
            data-slot="input-group-addon"
            data-align={align}
            className={cn(inputGroupAddonVariants({ align }), className)}
            onClick={(e) => {
                if ((e.target as HTMLElement).closest("button")) {
                    return
                }
                e.currentTarget.parentElement?.querySelector("input")?.focus()
            }}
            {...props}
        />
    )
}

const inputGroupButtonVariants = cva("flex items-center gap-2 text-sm shadow-none", {
    variants: {
        size: {
            xs: "h-6 gap-1 rounded-xs px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
            sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
            md: "h-9 gap-1.5 rounded-md px-3 has-[>svg]:px-3",
            "icon-xs": "size-6 rounded-xs p-0 has-[>svg]:p-0",
            "icon-sm": "size-8 p-0 has-[>svg]:p-0",
            "icon-md": "size-9 p-0 has-[>svg]:p-0",
        },
    },
    defaultVariants: {
        size: "xs",
    },
})

function InputGroupButton({
    className,
    radius = "full",
    type = "button",
    variant = "ghost",
    size = "xs",
    ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
    VariantProps<typeof inputGroupButtonVariants>) {
    return (
        <Button
            radius={radius}
            type={type}
            data-size={size}
            variant={variant}
            className={cn(inputGroupButtonVariants({ size }), className)}
            {...props}
        />
    )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            className={cn(
                "flex items-center gap-2 text-muted-foreground text-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
                className
            )}
            {...props}
        />
    )
}

function InputGroupInput({ className, ...props }: Omit<React.ComponentProps<"input">, "size">) {
    return (
        <Input
            data-slot="input-group-control"
            className={cn(
                "h-full flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
                className
            )}
            {...props}
        />
    )
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <Textarea
            data-slot="input-group-control"
            className={cn(
                "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
                className
            )}
            {...props}
        />
    )
}

export {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
}
