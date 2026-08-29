import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/shared/lib/class-names"
import { Field } from "@/shared/ui/field"

interface FormGroupProps extends Omit<ComponentProps<typeof Field>, "orientation"> {
    children: ReactNode
    direction?: "row" | "column"
    className?: string
}

export const FormGroup = ({
    children,
    direction = "column",
    className,
    ...props
}: FormGroupProps) => {
    return (
        <Field
            orientation={direction === "row" ? "horizontal" : "vertical"}
            className={cn(
                "flex h-fit w-full",
                direction === "row" ? "flex-row gap-x-2" : "flex-col gap-y-2",
                className
            )}
            {...props}
        >
            {children}
        </Field>
    )
}
