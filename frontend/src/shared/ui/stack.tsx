import * as React from "react"
import { cn } from "@/shared/lib/class-names"

const Stack = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "overflow-hidden rounded-xl border border-ds-surface-border bg-ds-surface [&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:top-0 [&>*+*]:before:right-4 [&>*+*]:before:left-4 [&>*+*]:before:h-px [&>*+*]:before:bg-ds-surface-border [&>*+*]:before:content-['']",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
Stack.displayName = "Stack"

const StackItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("p-4", className)} {...props} />
)
StackItem.displayName = "StackItem"

const StackTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h4 ref={ref} className={cn("font-medium text-ds-fg text-sm", className)} {...props} />
    )
)
StackTitle.displayName = "StackTitle"

const StackDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("max-w-2xl font-[450] text-ds-fg-subtle text-xs", className)}
        {...props}
    />
))
StackDescription.displayName = "StackDescription"

const StackActionButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("", className)} {...props} />
)
StackActionButton.displayName = "StackActionButton"

export { Stack, StackActionButton, StackDescription, StackItem, StackTitle }
