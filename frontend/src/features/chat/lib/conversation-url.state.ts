import { debounce, parseAsString, parseAsStringEnum } from "nuqs"
import { conversationSortValues } from "../model/conversation-sort"
import { conversationTypeFilterValues } from "../model/conversation-type"

const CONVERSATION_FILTER_VALUES = ["all", "unread"] as const

export const compoundParsers = {
    conversationsPageState: {
        search: parseAsString.withDefault("").withOptions({
            shallow: true,
            limitUrlUpdates: debounce(400),
            clearOnDefault: true,
        }),
        filter: parseAsStringEnum([...CONVERSATION_FILTER_VALUES])
            .withDefault("all")
            .withOptions({ shallow: true, clearOnDefault: true }),
        type: parseAsStringEnum([...conversationTypeFilterValues])
            .withDefault("all")
            .withOptions({ shallow: true, clearOnDefault: true }),
        sort: parseAsStringEnum([...conversationSortValues])
            .withDefault("newest")
            .withOptions({ shallow: true, clearOnDefault: true }),
    },
}
