import { Slider as SliderPrimitive } from "radix-ui"
import type * as React from "react"

import { cn } from "@/shared/lib/class-names"

function Slider({
    className,
    disabled,
    ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
    return (
        <SliderPrimitive.Root
            data-slot="slider"
            disabled={disabled}
            className={cn(
                "relative flex h-5 w-full touch-none select-none items-center data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                className
            )}
            {...props}
        >
            <SliderPrimitive.Track
                data-slot="slider-track"
                className="relative h-1.5 grow overflow-hidden rounded-full bg-ds-surface-interactive"
            >
                <SliderPrimitive.Range
                    data-slot="slider-range"
                    className="absolute h-full bg-ds-accent"
                />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb
                data-slot="slider-thumb"
                className="block size-4 rounded-full border border-ds-accent bg-ds-surface shadow-xs outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ds-ring/40 disabled:pointer-events-none disabled:opacity-50"
            />
        </SliderPrimitive.Root>
    )
}

export { Slider }
