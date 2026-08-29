import { debounce, parseAsString } from "nuqs"
import {
    createCommaSeparatedEnumParser,
    createIsoDateStringParser,
    createPageSizeParser,
    createPositiveIntegerParser,
    DEFAULT_PAGE_SIZE,
} from "@/shared/lib/url.state"

const REQUEST_LIFECYCLE_STATUS_FILTER_VALUES = [
    "invoiced",
    "quoted",
    "open",
    "closed",
    "draft",
] as const

const REQUEST_CLOSED_REASON_FILTER_VALUES = [
    "request_rejected",
    "quote_rejected",
    "cancelled",
    "expired",
] as const

const REQUEST_PRIORITY_FILTER_VALUES = ["low", "medium", "high"] as const

const ALL_REQUEST_LIFECYCLE_STATUSES = REQUEST_LIFECYCLE_STATUS_FILTER_VALUES.join(",")
const DEFAULT_REQUEST_LIFECYCLE_STATUSES = REQUEST_LIFECYCLE_STATUS_FILTER_VALUES.join(",")

export const FILTER_STATES = {
    REQUEST_LIFECYCLE_STATUS: {
        ALL: ALL_REQUEST_LIFECYCLE_STATUSES,
        EMPTY: "empty",
        DEFAULT: DEFAULT_REQUEST_LIFECYCLE_STATUSES,
    },
} as const

const requestLifecycleStatusParser = createCommaSeparatedEnumParser([
    ...REQUEST_LIFECYCLE_STATUS_FILTER_VALUES,
    FILTER_STATES.REQUEST_LIFECYCLE_STATUS.EMPTY,
]).withDefault(FILTER_STATES.REQUEST_LIFECYCLE_STATUS.DEFAULT)

const requestClosedReasonParser = createCommaSeparatedEnumParser(
    REQUEST_CLOSED_REASON_FILTER_VALUES
).withDefault("")

const requestPriorityFilterParser = createCommaSeparatedEnumParser(
    REQUEST_PRIORITY_FILTER_VALUES
).withDefault("")
const requestDateParser = createIsoDateStringParser().withDefault("")

export const compoundParsers = {
    requestsPageState: {
        page: createPositiveIntegerParser().withDefault(1).withOptions({ shallow: true }),
        limit: createPageSizeParser().withDefault(DEFAULT_PAGE_SIZE).withOptions({ shallow: true }),
        search: parseAsString.withDefault("").withOptions({
            shallow: true,
            limitUrlUpdates: debounce(500),
            clearOnDefault: true,
        }),
        lifecycleStatus: requestLifecycleStatusParser.withOptions({ shallow: true }),
        closedReason: requestClosedReasonParser.withOptions({
            shallow: true,
            clearOnDefault: true,
        }),
        assignedTo: parseAsString
            .withDefault("")
            .withOptions({ shallow: true, clearOnDefault: true }),
        priority: requestPriorityFilterParser.withOptions({
            shallow: true,
            clearOnDefault: true,
        }),
        fromDate: requestDateParser.withOptions({
            shallow: true,
            clearOnDefault: true,
        }),
        toDate: requestDateParser.withOptions({
            shallow: true,
            clearOnDefault: true,
        }),
    },
}
