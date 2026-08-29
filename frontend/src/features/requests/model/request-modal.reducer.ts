export interface RequestModalState {
    hasSelectedServices: boolean
    hasSelectedServicesContextKey: string | null
    isDownloading: boolean
    isAssignDialogOpen: boolean
    assignDialogContextKey: string | null
}

export type RequestModalAction =
    | {
          type: "SET_HAS_SELECTED_SERVICES"
          hasSelectedServices: boolean
          requestContextKey: string
      }
    | { type: "START_DOWNLOAD" }
    | { type: "FINISH_DOWNLOAD" }
    | { type: "OPEN_ASSIGN_DIALOG"; requestContextKey: string }
    | { type: "CLOSE_ASSIGN_DIALOG" }
    | { type: "CLEAR_REQUEST_CONTEXT" }

export const initialRequestModalState: RequestModalState = {
    hasSelectedServices: false,
    hasSelectedServicesContextKey: null,
    isDownloading: false,
    isAssignDialogOpen: false,
    assignDialogContextKey: null,
}

export function requestModalReducer(
    state: RequestModalState,
    action: RequestModalAction
): RequestModalState {
    switch (action.type) {
        case "SET_HAS_SELECTED_SERVICES":
            return {
                ...state,
                hasSelectedServices: action.hasSelectedServices,
                hasSelectedServicesContextKey: action.requestContextKey,
            }
        case "START_DOWNLOAD":
            return { ...state, isDownloading: true }
        case "FINISH_DOWNLOAD":
            return { ...state, isDownloading: false }
        case "OPEN_ASSIGN_DIALOG":
            return {
                ...state,
                isAssignDialogOpen: true,
                assignDialogContextKey: action.requestContextKey,
            }
        case "CLOSE_ASSIGN_DIALOG":
            return { ...state, isAssignDialogOpen: false, assignDialogContextKey: null }
        case "CLEAR_REQUEST_CONTEXT":
            return {
                ...state,
                hasSelectedServices: false,
                hasSelectedServicesContextKey: null,
                isAssignDialogOpen: false,
                assignDialogContextKey: null,
            }
    }
}
