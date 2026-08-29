import { ChevronDown, FileText } from "lucide-react"
import { useState } from "react"
import { cn } from "@/shared/lib/class-names"
import { formatCurrency } from "@/shared/lib/currency"
import { formatDate } from "@/shared/lib/date"
import { Badge } from "@/shared/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible"
import type { Quote } from "../../model/hooks/use-quote"

interface QuoteTimelineProps {
    quotes: Quote[]
}

export function QuoteTimeline({ quotes }: QuoteTimelineProps) {
    const [isOpen, setIsOpen] = useState(false)

    if (quotes.length === 0) {
        return null
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="group w-full">
                <div className="flex items-center gap-2 py-2 text-ds-fg-muted text-sm transition-colors hover:text-ds-fg">
                    <FileText className="h-4 w-4" />
                    <span>Quote History ({quotes.length} previous)</span>
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 transition-transform",
                            isOpen && "rotate-180 transform"
                        )}
                    />
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="relative pt-4 pl-8">
                    <div className="absolute top-0 bottom-0 left-2.5 w-[2px] border-ds-surface-border border-l-2 border-dashed" />

                    <div className="space-y-6">
                        {quotes.map((quote) => (
                            <div key={quote.id} className="relative">
                                <div className="absolute top-1 -left-6 h-5 w-5 rounded-full border-2 border-ds-surface-border bg-ds-surface" />

                                <div className="space-y-2 pb-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="font-medium text-ds-fg">
                                            {quote.quoteNumber}
                                        </span>
                                        <Badge
                                            variant={
                                                quote.status === "rejected" ? "danger" : "neutral"
                                            }
                                            size="sm"
                                        >
                                            {quote.status}
                                        </Badge>
                                        <span className="font-medium text-ds-fg">
                                            {formatCurrency(
                                                quote.pricing.totalTTC,
                                                quote.pricing.currency
                                            )}
                                        </span>
                                    </div>

                                    <p className="text-ds-fg-subtle text-sm">
                                        {formatDate(new Date(quote.createdAt), {
                                            format: "full",
                                            locale: "en-GB",
                                        })}
                                    </p>

                                    {quote.rejectionReason && (
                                        <div className="mt-2 rounded-sm border border-ds-surface-border bg-ds-surface-muted p-3">
                                            <p className="text-ds-fg-muted text-sm italic">
                                                "{quote.rejectionReason}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
