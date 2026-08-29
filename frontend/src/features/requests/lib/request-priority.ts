import type { RequestPriority } from "../model/request"

export function priorityLabelKey(priority: RequestPriority): string {
    return `requests:priority.${priority}`
}
