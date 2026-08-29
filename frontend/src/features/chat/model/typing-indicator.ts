export const TYPING_INDICATOR_EXPIRY_MS = 10_000

export interface TypingUserInfo {
    userId: string
    userName?: string
    userImage?: string | null
}

export interface TypingTimerApi<TimerId> {
    setTimeout: (callback: () => void, delayMs: number) => TimerId
    clearTimeout: (timerId: TimerId) => void
}

export interface TypingUserExpiryScheduler {
    refresh: (userId: string, onExpire: () => void) => void
    clear: (userId: string) => void
    clearAll: () => void
}

export function setTypingUser(
    previousUsers: ReadonlyMap<string, TypingUserInfo>,
    user: TypingUserInfo
): Map<string, TypingUserInfo> {
    const nextUsers = new Map(previousUsers)
    nextUsers.set(user.userId, user)
    return nextUsers
}

export function removeTypingUser(
    previousUsers: ReadonlyMap<string, TypingUserInfo>,
    userId: string
): Map<string, TypingUserInfo> {
    const nextUsers = new Map(previousUsers)
    nextUsers.delete(userId)
    return nextUsers
}

export function createTypingUserExpiryScheduler<TimerId>(
    timerApi: TypingTimerApi<TimerId>,
    expiryMs = TYPING_INDICATOR_EXPIRY_MS
): TypingUserExpiryScheduler {
    const timers = new Map<string, TimerId>()

    const clear = (userId: string) => {
        const timerId = timers.get(userId)
        if (timerId === undefined) {
            return
        }

        timerApi.clearTimeout(timerId)
        timers.delete(userId)
    }

    return {
        refresh: (userId, onExpire) => {
            clear(userId)

            const timerId = timerApi.setTimeout(() => {
                timers.delete(userId)
                onExpire()
            }, expiryMs)

            timers.set(userId, timerId)
        },
        clear,
        clearAll: () => {
            for (const timerId of timers.values()) {
                timerApi.clearTimeout(timerId)
            }
            timers.clear()
        },
    }
}
