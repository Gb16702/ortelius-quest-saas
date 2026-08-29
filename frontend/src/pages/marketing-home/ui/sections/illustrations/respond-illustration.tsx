import { Check } from "lucide-react"
import { motion } from "motion/react"

export function RespondIllustration() {
    const messages = [
        { time: "2.3min", status: "sent" },
        { time: "1.8min", status: "sent" },
        { time: "3.1min", status: "sent" },
    ]

    return (
        <div className="relative flex h-full w-full items-center justify-center">
            <div className="relative h-64 w-full max-w-[280px]">
                <div className="flex flex-col gap-3">
                    {messages.map((message) => (
                        <motion.div
                            key={message.time}
                            className="min-h-[80px] rounded-md border border-ds-surface-border bg-ds-surface p-4"
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 },
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                            }}
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <div className="h-2 w-2 rounded-full bg-ds-gray-300" />
                                <span className="font-mono text-ds-fg-muted text-xs">
                                    {message.time}
                                </span>
                            </div>

                            <div className="mb-3 space-y-1.5">
                                <div className="h-1.5 w-full rounded-full bg-ds-gray-200" />
                                <div className="h-1.5 w-3/4 rounded-full bg-ds-gray-200" />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Check className="size-3 text-ds-gray-600" />
                                <span className="text-ds-fg-muted text-xs">Sent</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
