import { parseAsString, useQueryState } from "nuqs"

const ACTION_PARAM = "action"
const LEAVE_ORG_ACTION = "leave-org"

export const useLeaveOrganizationDialog = () => {
    const [action, setAction] = useQueryState(ACTION_PARAM, parseAsString)

    const isOpen = action === LEAVE_ORG_ACTION

    const open = () => {
        void setAction(LEAVE_ORG_ACTION, { history: "push" })
    }

    const close = () => {
        void setAction(null)
    }

    return {
        isOpen,
        open,
        close,
    }
}
