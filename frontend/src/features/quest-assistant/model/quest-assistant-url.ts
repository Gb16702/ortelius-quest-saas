interface QuestAssistantLocation {
    pathname: string
    search: string
    hash: string
}

export const QUEST_ASSISTANT_THREAD_SEARCH_PARAM = "t"
export const QUEST_ASSISTANT_NEW_THREAD_VALUE = "new"

export type QuestAssistantThreadTarget =
    | {
          kind: "new"
          value: typeof QUEST_ASSISTANT_NEW_THREAD_VALUE
      }
    | {
          kind: "conversation"
          value: string
      }

export function getAssistantThreadTargetFromSearch(
    search: string
): QuestAssistantThreadTarget | null {
    const threadTarget = new URLSearchParams(search).get(QUEST_ASSISTANT_THREAD_SEARCH_PARAM)
    const trimmedThreadTarget = threadTarget?.trim()

    if (!trimmedThreadTarget) return null
    if (trimmedThreadTarget === QUEST_ASSISTANT_NEW_THREAD_VALUE) {
        return { kind: "new", value: QUEST_ASSISTANT_NEW_THREAD_VALUE }
    }

    return { kind: "conversation", value: trimmedThreadTarget }
}

export function getAssistantConversationIdFromSearch(search: string): string | null {
    const threadTarget = getAssistantThreadTargetFromSearch(search)

    return threadTarget?.kind === "conversation" ? threadTarget.value : null
}

export function setAssistantThreadParamInLocation(
    location: QuestAssistantLocation,
    threadTarget: string
): string {
    const searchParams = new URLSearchParams(location.search)
    searchParams.set(QUEST_ASSISTANT_THREAD_SEARCH_PARAM, threadTarget)
    const nextSearch = searchParams.toString()

    return `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${formatLocationHash(
        location.hash
    )}`
}

export function removeAssistantConversationParamFromLocation(
    location: QuestAssistantLocation
): string | null {
    const searchParams = new URLSearchParams(location.search)
    if (!searchParams.has(QUEST_ASSISTANT_THREAD_SEARCH_PARAM)) return null

    searchParams.delete(QUEST_ASSISTANT_THREAD_SEARCH_PARAM)
    const nextSearch = searchParams.toString()

    return `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${formatLocationHash(
        location.hash
    )}`
}

function formatLocationHash(hash: string): string {
    if (!hash) return ""
    return hash.startsWith("#") ? hash : `#${hash}`
}
