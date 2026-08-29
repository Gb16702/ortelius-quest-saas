import i18n from "i18next"
import { Copy, RotateCcw, TriangleAlert } from "lucide-react"
import { Component, type ErrorInfo, type ReactNode } from "react"
import { cn } from "@/shared/lib/class-names"
import { logError } from "@/shared/lib/error"
import { Button } from "@/shared/ui/button"
import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"

interface InlineErrorBoundaryProps {
    children: ReactNode
    componentName?: string
    className?: string
}

interface InlineErrorBoundaryState {
    hasError: boolean
    error: Error | null
    errorId: string | null
}

export class InlineErrorBoundary extends Component<
    InlineErrorBoundaryProps,
    InlineErrorBoundaryState
> {
    state: InlineErrorBoundaryState = {
        hasError: false,
        error: null,
        errorId: null,
    }

    static getDerivedStateFromError(error: Error): InlineErrorBoundaryState {
        const errorId = Math.random().toString(16).slice(2, 6).toUpperCase()
        return { hasError: true, error, errorId }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        logError(`Inline error in ${this.props.componentName ?? "block"}`, error, {
            componentStack: errorInfo.componentStack ?? undefined,
        })
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null, errorId: null })
    }

    handleCopy = async (): Promise<void> => {
        const { error, errorId } = this.state
        if (!error) return
        const payload = `ERR_${errorId}\n${error.name}: ${error.message}\n${error.stack ?? ""}`
        try {
            await navigator.clipboard.writeText(payload)
            showSuccessToast(i18n.t("common:errorBoundary.copySuccess"))
        } catch {
            showRetryErrorToast(i18n.t("common:errorBoundary.copyError"), {
                onRetry: () => this.handleCopy(),
            })
        }
    }

    render(): ReactNode {
        if (!this.state.hasError) return this.props.children

        const { error, errorId } = this.state
        const errorType = error?.name ?? "Error"
        const componentName = this.props.componentName ?? "this block"

        return (
            <div
                className={cn(
                    "flex items-center gap-3.5 rounded-sm border border-ds-surface-border px-5 py-5",
                    this.props.className
                )}
                style={{
                    background:
                        "repeating-linear-gradient(135deg, var(--color-ds-surface) 0 8px, var(--color-ds-canvas) 8px 16px)",
                }}
            >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-ds-surface-border bg-ds-surface">
                    <TriangleAlert className="size-3.5 text-ds-fg-muted" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-medium text-[13px] text-ds-fg">
                        {i18n.t("common:errorBoundary.title")}
                    </div>
                    <div className="mt-0.5 font-mono text-ds-fg-muted text-xs">
                        {errorType} in {componentName} · ERR_{errorId}
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="xs"
                    radius="full"
                    onClick={this.handleRetry}
                    className="text-xs"
                >
                    <RotateCcw className="size-3.5" />
                    {i18n.t("common:action.retry")}
                </Button>
                <Button
                    variant="ghost"
                    size="xs"
                    radius="full"
                    onClick={this.handleCopy}
                    className="min-w-0 text-ds-fg-muted text-xs"
                >
                    <Copy className="size-3.5" />
                    {i18n.t("common:action.copy")}
                </Button>
            </div>
        )
    }
}
