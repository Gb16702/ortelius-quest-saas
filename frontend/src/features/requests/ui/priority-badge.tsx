import type { RequestPriority } from "../model/request"
import { PriorityBars } from "./priority-bars"

interface PriorityBadgeProps {
    priority: RequestPriority | undefined
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    return <PriorityBars priority={priority} />
}
