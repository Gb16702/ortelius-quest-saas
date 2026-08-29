import { describe, expect, it } from "bun:test"
import {
    getAssistantConversationIdFromSearch,
    getAssistantThreadTargetFromSearch,
    removeAssistantConversationParamFromLocation,
    setAssistantThreadParamInLocation,
} from "../quest-assistant-url"

describe("quest assistant URL helpers", () => {
    it("reads assistant thread targets from URL search params", () => {
        expect(getAssistantThreadTargetFromSearch("?lifecycleStatus=open&t=new")).toEqual({
            kind: "new",
            value: "new",
        })
        expect(
            getAssistantThreadTargetFromSearch("?lifecycleStatus=open&t=assistant-conversation-1")
        ).toEqual({
            kind: "conversation",
            value: "assistant-conversation-1",
        })
        expect(getAssistantThreadTargetFromSearch("?t=   ")).toBeNull()
    })

    it("reads assistant conversation ids from URL search params", () => {
        expect(
            getAssistantConversationIdFromSearch("?lifecycleStatus=open&t=assistant-conversation-1")
        ).toBe("assistant-conversation-1")
        expect(getAssistantConversationIdFromSearch("?t=new")).toBeNull()
        expect(getAssistantConversationIdFromSearch("?t=   ")).toBeNull()
    })

    it("sets the assistant thread URL param", () => {
        expect(
            setAssistantThreadParamInLocation(
                {
                    pathname: "/org/quest/requests",
                    search: "?lifecycleStatus=open",
                    hash: "branding",
                },
                "new"
            )
        ).toBe("/org/quest/requests?lifecycleStatus=open&t=new#branding")
    })

    it("removes only the assistant conversation URL param", () => {
        expect(
            removeAssistantConversationParamFromLocation({
                pathname: "/org/quest/requests",
                search: "?lifecycleStatus=open&t=assistant-conversation-1",
                hash: "branding",
            })
        ).toBe("/org/quest/requests?lifecycleStatus=open#branding")
    })

    it("returns null when the assistant conversation URL param is absent", () => {
        expect(
            removeAssistantConversationParamFromLocation({
                pathname: "/org/quest/requests",
                search: "?lifecycleStatus=open",
                hash: "",
            })
        ).toBeNull()
    })
})
