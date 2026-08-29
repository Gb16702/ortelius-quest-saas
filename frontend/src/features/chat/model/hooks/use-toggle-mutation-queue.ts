import { useCallback, useRef } from "react"

interface ToggleMutationParams {
    id: string
    nextValue: boolean
}

interface ToggleMutationErrorParams extends ToggleMutationParams {
    confirmedValue: boolean
    error: unknown
    retry: () => Promise<boolean>
}

interface ToggleMutationQueueConfig {
    mutate: (params: ToggleMutationParams) => Promise<void>
    onOptimisticChange: (params: ToggleMutationParams) => void
    onSuccess?: (params: ToggleMutationParams) => void
    onError?: (params: ToggleMutationErrorParams) => void
}

interface QueueEntry {
    confirmedValue: boolean
    desiredValue: boolean
    isProcessing: boolean
    resolvers: ((success: boolean) => void)[]
}

export function useToggleMutationQueue({
    mutate,
    onOptimisticChange,
    onSuccess,
    onError,
}: ToggleMutationQueueConfig) {
    const configRef = useRef<ToggleMutationQueueConfig>({
        mutate,
        onOptimisticChange,
        onSuccess,
        onError,
    })
    configRef.current = { mutate, onOptimisticChange, onSuccess, onError }

    const queueRef = useRef(new Map<string, QueueEntry>())
    const enqueueRef = useRef<
        (id: string, nextValue: boolean, currentValue: boolean) => Promise<boolean>
    >(() => Promise.resolve(false))

    const processEntry = useCallback(async (id: string, entry: QueueEntry) => {
        let success = true

        while (entry.desiredValue !== entry.confirmedValue) {
            const nextValue = entry.desiredValue

            try {
                await configRef.current.mutate({ id, nextValue })
                entry.confirmedValue = nextValue
            } catch (error) {
                if (entry.desiredValue === entry.confirmedValue) {
                    continue
                }

                success = false
                const failedValue = entry.desiredValue
                const confirmedValue = entry.confirmedValue

                configRef.current.onOptimisticChange({ id, nextValue: confirmedValue })
                configRef.current.onError?.({
                    id,
                    nextValue: failedValue,
                    confirmedValue,
                    error,
                    retry: () => enqueueRef.current(id, failedValue, confirmedValue),
                })
                break
            }
        }

        if (success) {
            configRef.current.onSuccess?.({ id, nextValue: entry.confirmedValue })
        }

        queueRef.current.delete(id)
        entry.isProcessing = false

        const resolvers = entry.resolvers
        entry.resolvers = []
        for (const resolve of resolvers) {
            resolve(success)
        }
    }, [])

    const enqueue = useCallback(
        (id: string, nextValue: boolean, currentValue: boolean) => {
            let entry = queueRef.current.get(id)

            if (!entry) {
                entry = {
                    confirmedValue: currentValue,
                    desiredValue: nextValue,
                    isProcessing: false,
                    resolvers: [],
                }
                queueRef.current.set(id, entry)
            }

            entry.desiredValue = nextValue
            configRef.current.onOptimisticChange({ id, nextValue })

            const result = new Promise<boolean>((resolve) => {
                entry.resolvers.push(resolve)
            })

            if (!entry.isProcessing) {
                entry.isProcessing = true
                void processEntry(id, entry)
            }

            return result
        },
        [processEntry]
    )

    enqueueRef.current = enqueue

    return enqueue
}
