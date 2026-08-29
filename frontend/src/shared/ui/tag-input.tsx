import { X } from "lucide-react"
import * as React from "react"
import { cn } from "@/shared/lib/class-names"
import { Badge } from "@/shared/ui/badge"

interface TagInputProps {
    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    maxTags?: number
    validator?: (value: string) => boolean
}

const TagInput = React.forwardRef<HTMLDivElement, TagInputProps>(
    (
        {
            value = [],
            onChange,
            placeholder = "Add emails...",
            disabled = false,
            className,
            maxTags,
            validator = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
        },
        ref
    ) => {
        const [inputValue, setInputValue] = React.useState("")
        const [_isInputFocused, setIsInputFocused] = React.useState(false)
        const inputRef = React.useRef<HTMLInputElement>(null)

        const addTag = (tag: string) => {
            const trimmedTag = tag.trim()
            if (!trimmedTag) return

            if (value.includes(trimmedTag)) {
                setInputValue("")
                return
            }

            if (maxTags && value.length >= maxTags) {
                setInputValue("")
                return
            }

            if (!validator(trimmedTag)) {
                return
            }

            onChange([...value, trimmedTag])
            setInputValue("")
        }

        const removeTag = (index: number) => {
            onChange(value.filter((_, i) => i !== index))
        }

        const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault()
                addTag(inputValue)
            } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
                removeTag(value.length - 1)
            }
        }

        const onInputBlur = () => {
            setIsInputFocused(false)
            if (inputValue.trim()) {
                addTag(inputValue)
            }
        }

        const focusInput = () => {
            inputRef.current?.focus()
        }

        const _isValidInput = inputValue === "" || validator(inputValue.trim())

        return (
            // biome-ignore lint/a11y/noStaticElementInteractions: wrapper acts as click target to focus the inner input; keyboard users tab directly to the input
            <div
                ref={ref}
                className={cn(
                    "flex max-h-[140px] min-h-11 w-full overflow-y-scroll rounded-sm border border-ds-control-border bg-ds-surface p-2 text-sm transition-[color,border-color,background-color]",
                    "focus-within:border-ds-control-border-focus focus-within:ring-[3px] focus-within:ring-ds-gray-alpha-300 hover:border-ds-control-border-hover focus-within:hover:border-ds-control-border-focus",
                    disabled && "cursor-not-allowed opacity-50",
                    className
                )}
                onClick={focusInput}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        focusInput()
                    }
                }}
            >
                <div className="flex flex-1 flex-wrap gap-2">
                    {value.map((tag, index) => (
                        <Badge
                            key={tag}
                            variant="neutral"
                            size="sm"
                            className="flex h-7 items-center gap-1 pr-1 pl-2"
                        >
                            <span className={"lowercase tracking-wide"}>{tag}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeTag(index)
                                }}
                                disabled={disabled}
                                className="ml-1 rounded-full p-0.5 transition-colors hover:bg-ds-gray-200"
                            >
                                <X className="h-3 w-3" strokeWidth={"2.5"} />
                            </button>
                        </Badge>
                    ))}
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={onInputKeyDown}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={onInputBlur}
                        disabled={disabled || (maxTags !== undefined && value.length >= maxTags)}
                        placeholder={value.length === 0 ? placeholder : ""}
                        className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-ds-gray-700"
                    />
                </div>
            </div>
        )
    }
)

TagInput.displayName = "TagInput"

export { TagInput }
