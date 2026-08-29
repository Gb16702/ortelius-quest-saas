import { Calendar, Loader, User, UserPlus } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"

type Status = "pending" | "quoted" | "invoiced"

const statusConfig = {
    pending: {
        label: "Pending",
        color: "bg-ds-amber-700",
    },
    quoted: {
        label: "Quoted",
        color: "bg-ds-blue-700",
    },
    invoiced: {
        label: "Invoiced",
        color: "bg-ds-teal-600",
    },
}

interface Request {
    id: string
    client: string
    dateRange: string
    status: Status
    assignedTo: string
}

const initialRequests: Request[] = [
    {
        id: "REQ-847382",
        client: "Michael Chen",
        dateRange: "December 10 to 18",
        status: "pending",
        assignedTo: "Geoffrey Delhaye",
    },
    {
        id: "REQ-848383",
        client: "Axel Wolfs",
        dateRange: "January 5 to 12",
        status: "pending",
        assignedTo: "John Smith",
    },
    {
        id: "REQ-848384",
        client: "Emma Wilson",
        dateRange: "February 3 to 10",
        status: "pending",
        assignedTo: "Alexander Moore",
    },
]

export function RouteIllustration() {
    const [requests, setRequests] = useState<Request[]>(initialRequests)
    const [isSwipping, setIsSwipping] = useState(false)

    useEffect(() => {
        let isMounted = true

        const runCycle = async () => {
            while (isMounted) {
                await new Promise((resolve) => setTimeout(resolve, 2000))
                if (!isMounted) break
                setRequests((prev) => {
                    const updated = [...prev]
                    updated[0] = { ...updated[0], status: "quoted" }
                    return updated
                })

                await new Promise((resolve) => setTimeout(resolve, 2000))
                if (!isMounted) break
                setRequests((prev) => {
                    const updated = [...prev]
                    updated[0] = { ...updated[0], status: "invoiced" }
                    return updated
                })

                await new Promise((resolve) => setTimeout(resolve, 1500))
                if (!isMounted) break

                setIsSwipping(true)
                await new Promise((resolve) => setTimeout(resolve, 800))
                if (!isMounted) break

                setRequests((prev) => {
                    const [first, ...rest] = prev
                    return [...rest, { ...first, status: "pending" }]
                })
                setIsSwipping(false)
            }
        }

        runCycle()

        return () => {
            isMounted = false
        }
    }, [])

    return (
        <div className="relative flex h-full w-full items-center justify-center">
            <div className="relative h-64 w-64">
                <div className="pointer-events-none absolute inset-0 z-[200] overflow-hidden" />

                <div className="absolute right-0 bottom-52 min-w-[400px] translate-x-1/3 -translate-y-1/2">
                    {requests.map((request, i) => (
                        <motion.div
                            key={request.id}
                            className="absolute h-[700px] min-w-[700px] overflow-hidden rounded-md border border-ds-surface-border bg-ds-surface"
                            initial={false}
                            animate={
                                i === 0 && isSwipping
                                    ? {
                                          x: 300,
                                          y: 250,
                                          scale: 0.8,
                                          opacity: 0,
                                      }
                                    : {
                                          x: 0,
                                          y: isSwipping && i > 0 ? (i - 1) * -26 : i * -26,
                                          scale:
                                              isSwipping && i > 0
                                                  ? 1 - (i - 1) * 0.04
                                                  : 1 - i * 0.04,
                                          opacity: 1,
                                      }
                            }
                            style={{
                                zIndex: requests.length - i,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 25,
                                mass: 0.8,
                            }}
                        >
                            <div className="flex flex-col">
                                <div className="p-6">
                                    <h3 className="text-left font-semibold text-base text-ds-fg">
                                        {request.id}
                                    </h3>
                                </div>

                                <div className="flex flex-col gap-3 px-8 py-4 text-left">
                                    <div className="flex items-center gap-3">
                                        <User className="size-4 text-ds-fg-muted" />
                                        <div className="flex items-center gap-2">
                                            <span className="min-w-[100px] text-ds-fg-muted text-sm">
                                                Requester
                                            </span>
                                            <span className="text-ds-fg text-sm">
                                                {request.client}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <UserPlus className="size-4 text-ds-fg-muted" />
                                        <div className="flex items-center gap-2">
                                            <span className="min-w-[100px] text-ds-fg-muted text-sm">
                                                Assigned to
                                            </span>
                                            <span className="text-ds-fg text-sm">
                                                {request.assignedTo}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Calendar className="size-4 text-ds-fg-muted" />
                                        <div className="flex items-center gap-2">
                                            <span className="min-w-[100px] text-ds-fg-muted text-sm">
                                                Date range
                                            </span>
                                            <span className="text-ds-fg text-sm">
                                                {request.dateRange}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Loader className="size-4 text-ds-fg-muted" />
                                        <div className="flex items-center gap-2">
                                            <span className="min-w-[100px] text-ds-fg-muted text-sm">
                                                Status
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <motion.div
                                                    key={request.status}
                                                    className={`h-2 w-2 ${statusConfig[request.status].color} rounded-full`}
                                                    initial={{ scale: 0.8 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                />
                                                <span className="text-ds-fg text-sm">
                                                    {statusConfig[request.status].label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}
