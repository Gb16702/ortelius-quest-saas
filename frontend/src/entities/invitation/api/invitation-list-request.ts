import type { InvitationsListKeyParams } from "./invitation.query"

export function createInvitationsListSearchParams({
    page,
    limit,
    search,
    role,
    status,
}: InvitationsListKeyParams): URLSearchParams {
    const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })

    if (search) searchParams.set("email", search)
    if (role && role !== "all" && role !== "" && role !== "undefined") {
        searchParams.set("role", role)
    }
    if (status && status !== "all" && status !== "" && status !== "undefined") {
        if (status === "empty" || status === "EMPTY") {
            searchParams.set("status", "none")
        } else if (status !== "accepted,pending,canceled,expired") {
            searchParams.set("status", status)
        }
    }

    return searchParams
}
