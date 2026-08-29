import { describe, expect, it } from "bun:test"
import { createQuestAssistantRealtimeEventQueue } from "../quest-assistant-realtime-event-queue"

function createDeferredTask() {
    let resolveTask!: () => void
    const promise = new Promise<void>((resolve) => {
        resolveTask = resolve
    })

    return {
        promise,
        resolve: resolveTask,
    }
}

function flushQueuedTasks(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0))
}

describe("quest assistant realtime event queue", () => {
    it("processes live realtime events sequentially even when later work resolves sooner", async () => {
        const appliedEvents: string[] = []
        const errors: unknown[] = []
        const firstWrite = createDeferredTask()
        const secondWrite = createDeferredTask()
        const queue = createQuestAssistantRealtimeEventQueue({
            onError: (error) => errors.push(error),
        })

        queue.enqueue(async () => {
            await firstWrite.promise
            appliedEvents.push("part_delta")
        })
        queue.enqueue(async () => {
            await secondWrite.promise
            appliedEvents.push("part_completed")
        })

        secondWrite.resolve()
        await flushQueuedTasks()
        expect(appliedEvents).toEqual([])

        firstWrite.resolve()
        await flushQueuedTasks()

        expect(appliedEvents).toEqual(["part_delta", "part_completed"])
        expect(errors).toEqual([])
    })

    it("keeps processing after a failed event task", async () => {
        const appliedEvents: string[] = []
        const errors: unknown[] = []
        const queue = createQuestAssistantRealtimeEventQueue({
            onError: (error) => errors.push(error),
        })

        queue.enqueue(() => {
            throw new Error("IndexedDB failed")
        })
        queue.enqueue(() => {
            appliedEvents.push("part_delta")
        })

        await flushQueuedTasks()

        expect(errors).toHaveLength(1)
        expect(appliedEvents).toEqual(["part_delta"])
    })
})
