const controlSizeVariants = {
    default: "h-9 px-4 py-2 has-[>svg]:px-3",
    xs: "h-6 px-2 text-xs has-[>svg]:px-2.5 md:h-7",
    sm: "h-7 px-2 md:h-8 md:px-3",
    md: "h-8 px-4 has-[>svg]:px-3.5 md:h-9 md:px-4",
    lg: "h-9 px-5 has-[>svg]:px-4 md:h-10 md:px-4",
    xl: "h-11 px-4 has-[>svg]:px-4",
    "2xl": "h-12 px-6 has-[>svg]:px-5",
    icon: "size-9",
    "icon-sm": "size-8",
    "icon-xs": "size-7",
} as const

const controlRadiusVariants = {
    default: "rounded-full",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
} as const

const controlIconClassName =
    "[&_svg:not([class*='size-'])]:size-4.5 [&_svg]:pointer-events-none [&_svg]:shrink-0"

export { controlIconClassName, controlRadiusVariants, controlSizeVariants }
