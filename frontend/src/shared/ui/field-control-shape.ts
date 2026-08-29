const fieldControlHeightVariants = {
    xs: "h-7",
    sm: "h-8",
    md: "h-9",
    default: "h-10",
    lg: "h-11",
} as const

const fieldControlSizeVariants = {
    xs: "h-7 px-2 text-xs",
    sm: "h-8 px-2.5 text-sm",
    md: "h-9 px-3 text-sm",
    default: "h-10 px-3 text-sm",
    lg: "h-11 px-3 text-sm",
} as const

type FieldControlSize = keyof typeof fieldControlSizeVariants

export { fieldControlHeightVariants, fieldControlSizeVariants }
export type { FieldControlSize }
