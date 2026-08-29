import { parseAsString, useQueryState } from "nuqs"
import { parseOptionalSearchParam } from "@/shared/lib/validation/search-params"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { memberProfileIdSearchSchema } from "../schemas/member-profile-search.schema"

export const useMemberProfileDialog = () => {
    const [profileParam, setProfileParam] = useQueryState("profile", parseAsString)

    const openProfileUserId = parseOptionalSearchParam(profileParam, memberProfileIdSearchSchema)
    const isOpen = !!openProfileUserId

    const openProfile = (userId: string) => {
        void setProfileParam(parseSchema(memberProfileIdSearchSchema, userId), { history: "push" })
    }

    const closeProfile = () => {
        void setProfileParam(null)
    }

    return {
        openProfileUserId,
        isOpen,
        openProfile,
        closeProfile,
    }
}
