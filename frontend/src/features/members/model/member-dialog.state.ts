export type MemberDialogState =
    | { type: "idle" }
    | { type: "edit"; memberId: string; selectedRole: string }
    | { type: "remove"; memberId: string }
    | { type: "invite" }

export type MemberDialogAction =
    | { type: "OPEN_EDIT"; memberId: string; currentRole: string }
    | { type: "OPEN_REMOVE"; memberId: string }
    | { type: "OPEN_INVITE" }
    | { type: "UPDATE_ROLE"; role: string }
    | { type: "CLOSE" }

export const initialMemberDialogState: MemberDialogState = { type: "idle" }

export function memberDialogReducer(
    state: MemberDialogState,
    action: MemberDialogAction
): MemberDialogState {
    switch (action.type) {
        case "OPEN_EDIT":
            return { type: "edit", memberId: action.memberId, selectedRole: action.currentRole }
        case "OPEN_REMOVE":
            return { type: "remove", memberId: action.memberId }
        case "OPEN_INVITE":
            return { type: "invite" }
        case "UPDATE_ROLE":
            if (state.type === "edit") {
                return { ...state, selectedRole: action.role }
            }
            return state
        case "CLOSE":
            return initialMemberDialogState
    }
}

export function getEditingMemberId(state: MemberDialogState): string | null {
    return state.type === "edit" ? state.memberId : null
}

export function getRemovingMemberId(state: MemberDialogState): string | null {
    return state.type === "remove" ? state.memberId : null
}
