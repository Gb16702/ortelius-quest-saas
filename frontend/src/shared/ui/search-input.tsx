import { Search } from "lucide-react"
import { forwardRef } from "react"
import { cn } from "@/shared/lib/class-names"
import { getModifierKey } from "@/shared/lib/keyboard"
import { Input } from "@/shared/ui/input"
import { Kbd } from "@/shared/ui/kbd"

interface SearchInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
    value: string
    onChange: (value: string) => void
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
    placeholder?: string
    className?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ value, onChange, onKeyDown, placeholder = "Search", className, ...props }, ref) => {
        return (
            <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                <Input
                    ref={ref}
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    className={cn("w-full pr-16 pl-10", className)}
                    {...props}
                />
                <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
                    {value.trim() ? (
                        <Kbd
                            className="pointer-events-auto cursor-pointer transition-colors hover:bg-ds-surface-hover"
                            onClick={(e) => {
                                e.preventDefault()
                                onChange("")
                                ;(ref as React.RefObject<HTMLInputElement>)?.current?.focus()
                            }}
                        >
                            Esc
                        </Kbd>
                    ) : (
                        <Kbd>{getModifierKey()} K</Kbd>
                    )}
                </div>
            </div>
        )
    }
)

SearchInput.displayName = "SearchInput"
