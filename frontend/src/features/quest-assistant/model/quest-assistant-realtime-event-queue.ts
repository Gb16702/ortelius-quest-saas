export interface QuestAssistantRealtimeEventQueue {
    enqueue(task: () => Promise<void> | void): void
}

interface CreateQuestAssistantRealtimeEventQueueInput {
    onError: (error: unknown) => void
}

export function createQuestAssistantRealtimeEventQueue({
    onError,
}: CreateQuestAssistantRealtimeEventQueueInput): QuestAssistantRealtimeEventQueue {
    let queue = Promise.resolve()

    return {
        enqueue(task) {
            queue = queue
                .then(() => task())
                .catch((error) => {
                    try {
                        onError(error)
                    } catch {
                        // Keep the queue alive even if error reporting itself fails.
                    }
                })
        },
    }
}
