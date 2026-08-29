import i18n from "i18next"
import { toast } from "sonner"

import { Spinner } from "./spinner"
import { type ToastAction, ToastPill } from "./toast-pill"

interface ToastOptions {
    action?: ToastAction
    id?: string | number
}

const SUCCESS_DURATION = 5000
const ERROR_DURATION = 5000
const PENDING_DURATION = Number.POSITIVE_INFINITY

const pendingIcon = <Spinner />

const buildToastData = (duration: number, id?: string | number) =>
    id !== undefined ? { id, duration } : { duration }

export const showSuccessToast = (message: string, options?: ToastOptions) => {
    return toast.custom(
        (id) => (
            <ToastPill
                variant="success"
                message={message}
                action={options?.action}
                onDismiss={() => toast.dismiss(id)}
            />
        ),
        buildToastData(SUCCESS_DURATION, options?.id)
    )
}

export const showErrorToast = (message: string, options?: ToastOptions) => {
    return toast.custom(
        (id) => (
            <ToastPill
                variant="error"
                message={message}
                action={options?.action}
                onDismiss={() => toast.dismiss(id)}
            />
        ),
        buildToastData(ERROR_DURATION, options?.id)
    )
}

export const showPendingToast = (message: string, options?: ToastOptions) => {
    return toast.custom(
        (id) => (
            <ToastPill
                variant="pending"
                icon={pendingIcon}
                message={message}
                action={options?.action}
                onDismiss={() => toast.dismiss(id)}
            />
        ),
        buildToastData(PENDING_DURATION, options?.id)
    )
}

interface UndoToastOptions {
    onUndo: () => void
    undoLabel?: string
    duration?: number
}

export const showUndoToast = (
    message: string,
    { onUndo, undoLabel, duration = SUCCESS_DURATION }: UndoToastOptions,
    options?: Omit<ToastOptions, "action">
) => {
    const resolvedUndoLabel = undoLabel ?? i18n.t("common:action.undo")
    return toast.custom(
        (id) => (
            <ToastPill
                variant="success"
                message={message}
                action={{ label: resolvedUndoLabel, onClick: onUndo }}
                onDismiss={() => toast.dismiss(id)}
            />
        ),
        buildToastData(duration, options?.id)
    )
}

interface RetryToastOptions {
    onRetry: () => void
    retryLabel?: string
}

export const showRetryErrorToast = (
    message: string,
    { onRetry, retryLabel }: RetryToastOptions,
    options?: Omit<ToastOptions, "action">
) => {
    return showErrorToast(message, {
        action: { label: retryLabel ?? i18n.t("common:action.tryAgain"), onClick: onRetry },
        id: options?.id,
    })
}

interface PromiseToastMessages<T> {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
    successAction?: ToastAction
    id?: string | number
    shouldSettle?: () => boolean
}

export const showPromiseToast = <T,>(promise: Promise<T>, messages: PromiseToastMessages<T>) => {
    const pendingId = showPendingToast(messages.loading, { id: messages.id })

    promise.then(
        (data) => {
            if (messages.shouldSettle && !messages.shouldSettle()) return

            const message =
                typeof messages.success === "function" ? messages.success(data) : messages.success
            showSuccessToast(message, {
                action: messages.successAction,
                id: pendingId,
            })
        },
        (error: unknown) => {
            if (messages.shouldSettle && !messages.shouldSettle()) return

            const message =
                typeof messages.error === "function" ? messages.error(error) : messages.error
            showErrorToast(message, { id: pendingId })
        }
    )

    return promise
}

export type { ToastAction }
export { toast }
