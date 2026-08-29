import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/class-names"

const dotVariants = cva("inline-block shrink-0 transition-all duration-200", {
    variants: {
        size: {
            xs: "h-1.5 w-1.5",
            sm: "h-2 w-2",
            md: "h-2.5 w-2.5",
            lg: "h-3 w-3",
        },
        radius: {
            small: "rounded-[2px]",
            full: "rounded-full",
        },
        variant: {
            default: "bg-ds-gray-400",
            accent: "bg-ds-accent-700",
            primary: "bg-ds-blue-700",
            pink: "bg-ds-pink-700",
            purple: "bg-ds-purple-700",
            success: "bg-ds-green-700",
            warning: "bg-ds-amber-600",
            danger: "bg-ds-danger-solid",
            peach: "bg-ds-peach-700",
            cyan: "bg-ds-cyan-700",
            lime: "bg-ds-lime-700",
        },
    },
    defaultVariants: {
        size: "sm",
        radius: "full",
        variant: "default",
    },
})

interface DotProps extends VariantProps<typeof dotVariants> {
    className?: string
}

export function Dot({ size, radius, variant, className }: DotProps) {
    return <span className={cn(dotVariants({ size, radius, variant }), className)} />
}
