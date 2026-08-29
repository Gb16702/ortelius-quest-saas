import { describe, expect, it } from "bun:test"
import {
    createTypingUserExpiryScheduler,
    removeTypingUser,
    setTypingUser,
    TYPING_INDICATOR_EXPIRY_MS,
} from "../typing-indicator"

interface ScheduledTimer {
    callback: () => void
    delayMs: number
    isCleared: boolean
}

function createFakeTimerApi() {
    let nextTimerId = 0
    const timers = new Map<number, ScheduledTimer>()

    return {
        timers,
        timerApi: {
            setTimeout: (callback: () => void, delayMs: number) => {
                const timerId = nextTimerId
                nextTimerId += 1
                timers.set(timerId, { callback, delayMs, isCleared: false })
                return timerId
            },
            clearTimeout: (timerId: number) => {
                const timer = timers.get(timerId)
                if (timer) {
                    timer.isCleared = true
                }
            },
        },
        runTimer: (timerId: number) => {
            const timer = timers.get(timerId)
            if (!timer || timer.isCleared) {
                return
            }
            timer.callback()
        },
    }
}

describe("typing indicator model", () => {
    it("adds and removes typing users without mutating the previous map", () => {
        const previousUsers = new Map([
            [
                "user-1",
                {
                    userId: "user-1",
                    userName: "Ada",
                    userImage: null,
                },
            ],
        ])

        const withSecondUser = setTypingUser(previousUsers, {
            userId: "user-2",
            userName: "Grace",
            userImage: "https://example.test/grace.png",
        })
        const withoutFirstUser = removeTypingUser(withSecondUser, "user-1")

        expect(previousUsers.has("user-2")).toBe(false)
        expect(withSecondUser.get("user-2")?.userName).toBe("Grace")
        expect(withoutFirstUser.has("user-1")).toBe(false)
        expect(withSecondUser.has("user-1")).toBe(true)
    })

    it("coalesces typing expiry per user to the latest timer", () => {
        const { timers, timerApi, runTimer } = createFakeTimerApi()
        const expiredUsers: string[] = []
        const scheduler = createTypingUserExpiryScheduler(timerApi)

        scheduler.refresh("user-1", () => expiredUsers.push("first"))
        scheduler.refresh("user-1", () => expiredUsers.push("second"))

        expect(timers.get(0)?.delayMs).toBe(TYPING_INDICATOR_EXPIRY_MS)
        expect(timers.get(0)?.isCleared).toBe(true)
        expect(timers.get(1)?.delayMs).toBe(TYPING_INDICATOR_EXPIRY_MS)

        runTimer(0)
        expect(expiredUsers).toEqual([])

        runTimer(1)
        expect(expiredUsers).toEqual(["second"])
    })

    it("clears typing expiry timers when stop-typing or unmount cleanup runs", () => {
        const { timers, timerApi, runTimer } = createFakeTimerApi()
        const expiredUsers: string[] = []
        const scheduler = createTypingUserExpiryScheduler(timerApi)

        scheduler.refresh("user-1", () => expiredUsers.push("user-1"))
        scheduler.refresh("user-2", () => expiredUsers.push("user-2"))
        scheduler.clear("user-1")
        scheduler.clearAll()

        expect(timers.get(0)?.isCleared).toBe(true)
        expect(timers.get(1)?.isCleared).toBe(true)

        runTimer(0)
        runTimer(1)

        expect(expiredUsers).toEqual([])
    })
})
