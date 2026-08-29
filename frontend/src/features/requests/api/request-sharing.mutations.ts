import { useMutation } from "@tanstack/react-query"
import type { ShareToTeamChatResponse } from "../model/request"
import { shareToTeamChatResponseSchema } from "../model/schemas/request.schema"
import { parseJsonResponse } from "./request.response"

export function useShareToTeamChat() {
    return useMutation<ShareToTeamChatResponse, Error, string>({
        mutationFn: async (requestId: string) => {
            const res = await fetch(`/api/requests/${requestId}/share-to-team-chat`, {
                method: "POST",
                credentials: "include",
            })

            return parseJsonResponse(res, shareToTeamChatResponseSchema, "Failed to share request")
        },
    })
}
