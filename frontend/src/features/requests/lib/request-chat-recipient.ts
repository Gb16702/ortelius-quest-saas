import type { PersonalUserRequest, UserRequest } from "../model/request"

function getPersonalRequestOrganization(request: UserRequest): PersonalUserRequest["organization"] {
    if (!request.organization) {
        throw new Error("Personal request row is missing an organization recipient")
    }

    return request.organization
}

export function getRequestChatRecipientName(
    request: UserRequest,
    isOrganizationView: boolean
): string {
    if (isOrganizationView) {
        return request.requester.name
    }

    return getPersonalRequestOrganization(request).name
}

export function getPersonalRequestOrganizationDisplay(request: UserRequest) {
    return getPersonalRequestOrganization(request)
}
