import { parseAsString, useQueryStates } from "nuqs"
import { parseOptionalSearchParam } from "@/shared/lib/validation/search-params"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    requestNumberSearchSchema,
    requestSheetFromTeamChatSearchSchema,
    requestSheetTeamChatOrganizationIdSearchSchema,
} from "../request-search-params"

interface OpenRequestOptions {
    fromTeamChat?: boolean
    teamChatOrganizationId?: string | null
}

export const useRequestSheet = () => {
    const [requestSheetState, setRequestSheetState] = useQueryStates({
        request: parseAsString,
        fromTeamChat: parseAsString,
        teamChatOrganizationId: parseAsString,
    })

    const openRequestNumber = parseOptionalSearchParam(
        requestSheetState.request,
        requestNumberSearchSchema
    )
    const isOpen = !!openRequestNumber
    const fromTeamChat =
        parseOptionalSearchParam(
            requestSheetState.fromTeamChat,
            requestSheetFromTeamChatSearchSchema
        ) === "true"
    const teamChatOrganizationId = fromTeamChat
        ? parseOptionalSearchParam(
              requestSheetState.teamChatOrganizationId,
              requestSheetTeamChatOrganizationIdSearchSchema
          )
        : null

    const openRequest = (requestNumber: string, options?: OpenRequestOptions) => {
        if (options?.fromTeamChat) {
            void setRequestSheetState(
                {
                    request: parseSchema(requestNumberSearchSchema, requestNumber),
                    fromTeamChat: "true",
                    teamChatOrganizationId: options.teamChatOrganizationId
                        ? parseSchema(
                              requestSheetTeamChatOrganizationIdSearchSchema,
                              options.teamChatOrganizationId
                          )
                        : null,
                },
                { history: "push" }
            )
            return
        }

        void setRequestSheetState(
            {
                request: parseSchema(requestNumberSearchSchema, requestNumber),
                fromTeamChat: null,
                teamChatOrganizationId: null,
            },
            { history: "push" }
        )
    }

    const closeRequest = () => {
        void setRequestSheetState({
            request: null,
            fromTeamChat: null,
            teamChatOrganizationId: null,
        })
    }

    return {
        openRequestNumber,
        isOpen,
        fromTeamChat,
        teamChatOrganizationId,
        openRequest,
        closeRequest,
    }
}
