import { FileText, Mail, MessageCircle } from "lucide-react"
import { motion } from "motion/react"

export function CentralizeIllustration() {
    return (
        <div className="relative flex h-full w-full items-center justify-center">
            <div className="relative h-64 w-64 overflow-hidden">
                <div
                    className="pointer-events-none absolute inset-0 z-[200] overflow-hidden"
                    style={{
                        background:
                            "radial-gradient(88% 40% at 50% 50%, transparent 87.15%, var(--color-ds-surface) 100%)",
                    }}
                />

                <motion.div
                    className="absolute z-10 flex w-fit items-center justify-center rounded-full border border-ds-surface-border bg-ds-inverse-surface px-2.5 py-1"
                    style={{
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    <span className="font-semibold text-ds-surface text-sm">Quest</span>
                </motion.div>

                {[100, 170, 240].map((size) => (
                    <motion.div
                        key={size}
                        className="absolute rounded-[100%] border border-ds-surface-border"
                        style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                        }}
                    />
                ))}

                {[
                    { Icon: Mail, offset: 0 },
                    { Icon: FileText, offset: 120 },
                    { Icon: MessageCircle, offset: 240 },
                ].map((item) => (
                    <motion.div
                        key={item.offset}
                        className="absolute"
                        style={{
                            left: "50%",
                            top: "50%",
                        }}
                        initial={{ rotate: item.offset }}
                        animate={{
                            rotate: item.offset + 360,
                        }}
                        transition={{
                            duration: 12,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                    >
                        <motion.div
                            className="absolute h-8 w-8"
                            style={{
                                left: "-16px",
                                top: "-96px",
                            }}
                            initial={{ rotate: -item.offset }}
                            animate={{
                                rotate: -item.offset - 360,
                            }}
                            transition={{
                                duration: 12,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                            }}
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ds-surface-interactive shadow-dropdown">
                                <item.Icon className="size-4.5 text-ds-fg" />
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
