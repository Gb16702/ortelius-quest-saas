import { describe, expect, it } from "bun:test"
import { initialRequestModalState, requestModalReducer } from "../request-modal.reducer"

describe("requestModalReducer", () => {
    it("keys edit-only selected-services state to the active request context", () => {
        const state = requestModalReducer(initialRequestModalState, {
            type: "SET_HAS_SELECTED_SERVICES",
            hasSelectedServices: true,
            requestContextKey: "open:REQ-A:organization:org-1",
        })

        expect(state.hasSelectedServices).toBe(true)
        expect(state.hasSelectedServicesContextKey).toBe("open:REQ-A:organization:org-1")
    })

    it("keys the assign dialog to the request context that opened it", () => {
        const state = requestModalReducer(initialRequestModalState, {
            type: "OPEN_ASSIGN_DIALOG",
            requestContextKey: "open:REQ-A:organization:org-1",
        })

        expect(state.isAssignDialogOpen).toBe(true)
        expect(state.assignDialogContextKey).toBe("open:REQ-A:organization:org-1")

        const closedState = requestModalReducer(state, { type: "CLOSE_ASSIGN_DIALOG" })

        expect(closedState.isAssignDialogOpen).toBe(false)
        expect(closedState.assignDialogContextKey).toBeNull()
    })

    it("clears request-specific modal state without touching global progress flags", () => {
        const withSelection = requestModalReducer(initialRequestModalState, {
            type: "SET_HAS_SELECTED_SERVICES",
            hasSelectedServices: true,
            requestContextKey: "open:REQ-A:organization:org-1",
        })
        const withDialog = requestModalReducer(withSelection, {
            type: "OPEN_ASSIGN_DIALOG",
            requestContextKey: "open:REQ-A:organization:org-1",
        })
        const withDownload = requestModalReducer(withDialog, { type: "START_DOWNLOAD" })

        const cleared = requestModalReducer(withDownload, { type: "CLEAR_REQUEST_CONTEXT" })

        expect(cleared.hasSelectedServices).toBe(false)
        expect(cleared.hasSelectedServicesContextKey).toBeNull()
        expect(cleared.isAssignDialogOpen).toBe(false)
        expect(cleared.assignDialogContextKey).toBeNull()
        expect(cleared.isDownloading).toBe(true)
    })
})
