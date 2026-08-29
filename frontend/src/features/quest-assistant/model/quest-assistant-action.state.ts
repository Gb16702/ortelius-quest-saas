import type { AssistantAction } from "./quest-assistant"

export function getActionRoutePath(action: AssistantAction): string | null {
    const routePath = action.result?.routePath
    if (typeof routePath !== "string") return null
    if (!routePath.startsWith("/") || routePath.startsWith("//") || routePath.includes("://")) {
        return null
    }

    return routePath
}

export function mergeAssistantActions(
    existingActions: AssistantAction[],
    streamedActions: AssistantAction[]
): AssistantAction[] {
    const actionsById = new Map<string, AssistantAction>()

    for (const action of existingActions) {
        actionsById.set(action.id, action)
    }

    for (const action of streamedActions) {
        actionsById.set(action.id, action)
    }

    return [...actionsById.values()]
}

export function upsertAssistantAction(
    actions: AssistantAction[],
    nextAction: AssistantAction
): AssistantAction[] {
    const existingAction = actions.find((action) => action.id === nextAction.id)
    if (existingAction && isAssistantActionNewer(existingAction, nextAction)) {
        return actions
    }

    const nextActions = actions.filter((action) => action.id !== nextAction.id)
    return [...nextActions, nextAction]
}

function isAssistantActionNewer(existingAction: AssistantAction, nextAction: AssistantAction) {
    const existingUpdatedAt = Date.parse(existingAction.updatedAt)
    const nextUpdatedAt = Date.parse(nextAction.updatedAt)

    return Number.isFinite(existingUpdatedAt) && Number.isFinite(nextUpdatedAt)
        ? existingUpdatedAt > nextUpdatedAt
        : false
}
