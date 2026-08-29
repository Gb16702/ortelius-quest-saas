import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import type { VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/shared/lib/class-names"
import { buttonVariants } from "@/shared/ui/button"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-ds-canvas/[.5] data-[state=closed]:animate-out data-[state=open]:animate-in",
            className
        )}
        {...props}
    />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
        overlayClassName?: string
    }
>(({ className, children, onOpenAutoFocus, overlayClassName, ...props }, ref) => (
    <DialogPortal>
        <div
            aria-hidden
            className={cn(
                "fade-in-0 fixed inset-0 z-50 animate-in bg-ds-canvas/[.5] duration-200",
                overlayClassName
            )}
        />
        <DialogPrimitive.Content
            ref={ref}
            onOpenAutoFocus={onOpenAutoFocus}
            className={cn(
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex max-h-[min(800px,80vh)] min-h-[220px] w-full max-w-[550px] translate-x-[-50%] translate-y-[-50%] flex-col overflow-y-auto overscroll-contain bg-ds-surface shadow-modal outline-none duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in sm:rounded-md",
                className
            )}
            {...props}
        >
            {children}
        </DialogPrimitive.Content>
    </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
    className,
    align = "left",
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {
    align?: "center" | "left"
}) => (
    <div
        className={cn(
            "flex flex-col gap-1 px-8 py-6",
            align === "center" ? "text-center [&>*]:text-center" : "[&>*]:!text-left text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("space-y-2 bg-ds-canvas p-8", className)} {...props} />
)
DialogBody.displayName = "DialogBody"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "sticky bottom-0 z-10 mt-auto flex flex-col-reverse border-ds-surface-border border-t bg-ds-canvas px-8 py-3 sm:flex-row sm:justify-between sm:space-x-2",
            "[&>*:only-child]:ml-auto",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, children, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} asChild>
        <h4
            {...props}
            className={cn(
                "font-semibold text-2xl text-ds-fg leading-[1.4] tracking-tight",
                className
            )}
        >
            {children}
        </h4>
    </DialogPrimitive.Title>
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description ref={ref} className={cn("text-sm", className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

const DialogSeparator = ({
    className,
    orientation = "horizontal",
    decorative = true,
    ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) => (
    <SeparatorPrimitive.Root
        data-slot="separator"
        decorative={decorative}
        orientation={orientation}
        className={cn(
            "shrink-0 bg-ds-surface-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
            className
        )}
        {...props}
    />
)
DialogSeparator.displayName = "DialogSeparator"

const DialogAction = React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<"button"> & VariantProps<typeof buttonVariants>
>(({ className, variant = "solid", size = "lg", radius = "full", ...props }, ref) => (
    <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, radius }), className)}
        {...props}
    />
))

DialogAction.displayName = "DialogAction"

const DialogCancel = React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<"button"> & VariantProps<typeof buttonVariants>
>(({ className, variant = "outline", size = "lg", radius = "full", ...props }, ref) => (
    <button
        type={"button"}
        ref={ref}
        className={cn(buttonVariants({ variant, size, radius }), className)}
        {...props}
    />
))
DialogCancel.displayName = "DialogCancel"

export {
    Dialog,
    DialogAction,
    DialogBody,
    DialogCancel,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogSeparator,
    DialogTitle,
    DialogTrigger,
}
