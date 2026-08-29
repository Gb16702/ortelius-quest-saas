import { useMemo, useReducer, useRef } from "react"

interface Participant {
    id: string
    name: string
    image?: string | null
    role?: string
}

type MentionType = "user" | "role"

interface MentionResult {
    type: MentionType
    id: string
    name: string
    displayName: string
    image?: string | null
}

interface MentionState {
    isOpen: boolean
    query: string
    startIndex: number | null
    selectedValue: string
}

type MentionAction =
    | { type: "OPEN"; startIndex: number }
    | { type: "CLOSE" }
    | { type: "UPDATE_QUERY"; query: string }
    | { type: "SET_SELECTED_VALUE"; value: string }

const initialState: MentionState = {
    isOpen: false,
    query: "",
    startIndex: null,
    selectedValue: "",
}

function mentionReducer(state: MentionState, action: MentionAction): MentionState {
    switch (action.type) {
        case "OPEN":
            return {
                isOpen: true,
                query: "",
                startIndex: action.startIndex,
                selectedValue: "",
            }
        case "CLOSE":
            return initialState
        case "UPDATE_QUERY":
            return { ...state, query: action.query, selectedValue: "" }
        case "SET_SELECTED_VALUE":
            return { ...state, selectedValue: action.value }
        default:
            return state
    }
}

const ROLES = [
    { id: "owner", name: "owner", label: "Owner" },
    { id: "admin", name: "admin", label: "Admin" },
    { id: "member", name: "member", label: "Member" },
] as const

const MAX_RESULTS = 5

interface UseMentionsOptions {
    participants: Participant[]
    currentUserId?: string
    canMentionRoles?: boolean
    onInsertMention: (
        text: string,
        startIndex: number,
        endIndex: number,
        mention: MentionResult
    ) => void
}

export function useMentions({
    participants,
    currentUserId,
    canMentionRoles = true,
    onInsertMention,
}: UseMentionsOptions) {
    const [state, dispatch] = useReducer(mentionReducer, initialState)
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)

    const filteredParticipants = useMemo(
        () => participants.filter((p) => p.id !== currentUserId),
        [participants, currentUserId]
    )

    const { filteredRoles, filteredMembers, allValues } = useMemo(() => {
        const normalizedQuery = state.query.toLowerCase()

        const roles = canMentionRoles
            ? ROLES.filter((r) => r.name.includes(normalizedQuery)).slice(0, MAX_RESULTS)
            : []

        const members = filteredParticipants
            .filter((p) => p.name.toLowerCase().includes(normalizedQuery))
            .slice(0, MAX_RESULTS)

        const values = [
            ...members.map((p) => `member-${p.id}`),
            ...roles.map((r) => `role-${r.id}`),
        ]

        return {
            filteredRoles: roles,
            filteredMembers: members,
            allValues: values,
        }
    }, [state.query, filteredParticipants, canMentionRoles])

    const selectedValue = state.selectedValue || allValues[0] || ""

    const detectMentionTrigger = (value: string, cursorPosition: number) => {
        const charBeforeCursor = value[cursorPosition - 1]
        const charBeforeAt = value[cursorPosition - 2]

        if (charBeforeCursor === "@" && (cursorPosition === 1 || /\s/.test(charBeforeAt || ""))) {
            dispatch({ type: "OPEN", startIndex: cursorPosition - 1 })
            return
        }

        if (state.isOpen && state.startIndex !== null) {
            const textAfterAt = value.slice(state.startIndex + 1, cursorPosition)

            if (
                !value[state.startIndex] ||
                value[state.startIndex] !== "@" ||
                textAfterAt.includes(" ")
            ) {
                dispatch({ type: "CLOSE" })
                return
            }

            dispatch({ type: "UPDATE_QUERY", query: textAfterAt })
        }
    }

    const checkCursorPosition = (value: string, cursorPosition: number) => {
        if (state.isOpen && state.startIndex !== null) {
            if (cursorPosition <= state.startIndex) {
                dispatch({ type: "CLOSE" })
            }
            return
        }

        const charBeforeCursor = value[cursorPosition - 1]
        const charBeforeAt = value[cursorPosition - 2]
        if (charBeforeCursor === "@" && (cursorPosition === 1 || /\s/.test(charBeforeAt || ""))) {
            dispatch({ type: "OPEN", startIndex: cursorPosition - 1 })
        }
    }

    const handleSelect = (mention: MentionResult) => {
        if (state.startIndex === null) return

        const textarea = textareaRef.current
        if (!textarea) return

        const endIndex = textarea.selectionStart
        const insertText = `@${mention.name} `

        onInsertMention(insertText, state.startIndex, endIndex, mention)
        dispatch({ type: "CLOSE" })
    }

    const handleClose = () => {
        dispatch({ type: "CLOSE" })
    }

    const selectCurrentItem = () => {
        if (!selectedValue) return

        if (selectedValue.startsWith("role-")) {
            const roleId = selectedValue.replace("role-", "")
            const role = filteredRoles.find((r) => r.id === roleId)
            if (role) {
                handleSelect({
                    type: "role",
                    id: role.id,
                    name: role.name,
                    displayName: `@${role.name}`,
                })
            }
        } else if (selectedValue.startsWith("member-")) {
            const memberId = selectedValue.replace("member-", "")
            const member = filteredMembers.find((m) => m.id === memberId)
            if (member) {
                handleSelect({
                    type: "user",
                    id: member.id,
                    name: member.name,
                    displayName: `@${member.name}`,
                    image: member.image,
                })
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent): boolean => {
        if (!state.isOpen || allValues.length === 0) return false

        const currentIndex = allValues.indexOf(selectedValue)

        switch (e.key) {
            case "ArrowUp":
                e.preventDefault()
                if (currentIndex > 0) {
                    dispatch({
                        type: "SET_SELECTED_VALUE",
                        value: allValues[currentIndex - 1],
                    })
                }
                return true
            case "ArrowDown":
                e.preventDefault()
                if (currentIndex < allValues.length - 1) {
                    dispatch({
                        type: "SET_SELECTED_VALUE",
                        value: allValues[currentIndex + 1],
                    })
                }
                return true
            case "Enter":
            case "Tab":
                e.preventDefault()
                selectCurrentItem()
                return true
            case "Escape":
                e.preventDefault()
                handleClose()
                return true
            default:
                return false
        }
    }

    return {
        state,
        textareaRef,
        filteredParticipants: filteredMembers,
        filteredRoles,
        selectedValue,
        detectMentionTrigger,
        checkCursorPosition,
        handleSelect,
        handleClose,
        handleKeyDown,
    }
}

export type { MentionResult, Participant }
