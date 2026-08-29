import { useTranslation } from "react-i18next"
import { formatDate } from "@/shared/lib/date"

interface DateSeparatorProps {
    date: string
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
    const { t, i18n } = useTranslation("common")

    const formatDateLabel = (dateStr: string) => {
        const parsed = new Date(dateStr)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const isToday = parsed.toDateString() === today.toDateString()
        const isYesterday = parsed.toDateString() === yesterday.toDateString()

        if (isToday) {
            return t("date.today")
        }
        if (isYesterday) {
            return t("date.yesterday")
        }

        const locale = i18n.language || "en-GB"
        const isThisYear = parsed.getFullYear() === today.getFullYear()

        if (isThisYear) {
            return parsed.toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
            })
        }

        return formatDate(parsed, {
            format: "long",
            locale,
        })
    }

    return (
        <div className={`relative my-12 flex w-full items-center justify-center`}>
            <div className="absolute top-1/2 right-0 left-0 -translate-y-1/2 border-ds-surface-border border-b border-dashed"></div>
            <span className="relative z-10 rounded-full border border-ds-surface-border bg-ds-surface px-4 py-1.5 font-medium text-ds-fg text-xs">
                {formatDateLabel(date)}
            </span>
        </div>
    )
}
