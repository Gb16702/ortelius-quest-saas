import { parseAsString, useQueryStates } from "nuqs"

export function useSendRequestSheet() {
    const [sendRequestState, setSendRequestState] = useQueryStates({
        "send-request": parseAsString,
        step: parseAsString,
    })

    const isOpen = sendRequestState["send-request"] !== null

    const open = () => {
        void setSendRequestState({ "send-request": "true" }, { history: "push" })
    }

    const close = () => {
        void setSendRequestState({
            "send-request": null,
            step: null,
        })
    }

    return { isOpen, open, close }
}
