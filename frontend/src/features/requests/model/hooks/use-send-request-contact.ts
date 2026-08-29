import { useUser } from "@/entities/session"
import { useSendRequestStore } from "../use-send-request.store"

function splitName(name: string | undefined): { firstName: string; lastName: string } {
    const parts = name?.trim().split(/\s+/) ?? []
    return {
        firstName: parts[0] ?? "",
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
    }
}

export interface SendRequestContact {
    firstName: string
    lastName: string
    email: string
    setFirstName: (value: string) => void
    setLastName: (value: string) => void
    setEmail: (value: string) => void
}

export function useSendRequestContact(): SendRequestContact {
    const user = useUser()
    const { data, updateData } = useSendRequestStore()

    const userDefaults = splitName(user?.name)
    const firstName = data.firstName ?? userDefaults.firstName
    const lastName = data.lastName ?? userDefaults.lastName
    const email = data.email ?? user?.email ?? ""

    return {
        firstName,
        lastName,
        email,
        setFirstName: (value) => updateData({ firstName: value }),
        setLastName: (value) => updateData({ lastName: value }),
        setEmail: (value) => updateData({ email: value }),
    }
}
