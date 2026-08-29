import { Link } from "@tanstack/react-router"
import { ArrowLeft, Check, Copy, RefreshCw, SearchX, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import { GridCross } from "@/shared/ui/grid-cross"

type OrganizationShowcaseErrorVariant = "not-found" | "unavailable"

interface OrganizationShowcaseDevErrorContext {
    route?: string
    source?: string
    reason?: string
    slug?: string
}

export interface OrganizationShowcaseDevErrorDetails {
    name: string
    message: string
    stack: string | null
    status: number | null
    data: string | null
    context: OrganizationShowcaseDevErrorContext | null
}

interface OrganizationShowcaseErrorPageProps {
    variant: OrganizationShowcaseErrorVariant
}

interface OrganizationShowcaseDevErrorPageProps {
    details: OrganizationShowcaseDevErrorDetails
}

const productionIcon: Record<OrganizationShowcaseErrorVariant, typeof SearchX> = {
    "not-found": SearchX,
    unavailable: TriangleAlert,
}

export function OrganizationShowcaseErrorPage({ variant }: OrganizationShowcaseErrorPageProps) {
    const { t } = useTranslation("organization-showcase")
    const Icon = productionIcon[variant]
    const canRetry = variant === "unavailable"
    const title = variant === "not-found" ? t("error.notFoundTitle") : t("error.unavailableTitle")
    const message =
        variant === "not-found" ? t("error.notFoundMessage") : t("error.unavailableMessage")

    return (
        <>
            <title>{title}</title>
            <main className="relative flex min-h-dvh items-center justify-center bg-ds-canvas px-4 py-12">
                <section className="relative w-full max-w-4xl border border-ds-surface-border border-dashed bg-ds-surface px-6 py-12 text-center sm:px-12 sm:py-16">
                    <GridCross className="top-0 left-0" />
                    <GridCross className="top-0 right-0" />
                    <GridCross className="bottom-0 left-0" />
                    <GridCross className="right-0 bottom-0" />

                    <div className="mx-auto flex max-w-xl flex-col items-center gap-8">
                        <div className="flex size-12 items-center justify-center rounded-full border border-ds-surface-border bg-ds-canvas">
                            <Icon className="size-5 text-ds-fg-muted" strokeWidth={2} />
                        </div>

                        <div className="space-y-3">
                            <h1 className="font-semibold text-3xl text-ds-fg">{title}</h1>
                            <p className="text-base text-ds-fg-muted leading-7">{message}</p>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                            {canRetry && (
                                <Button
                                    type="button"
                                    size="lg"
                                    radius="full"
                                    onClick={() => window.location.reload()}
                                >
                                    <RefreshCw className="size-4" />
                                    {t("error.retry")}
                                </Button>
                            )}
                            <Button
                                asChild
                                variant={canRetry ? "outline" : "brand"}
                                size="lg"
                                radius="full"
                            >
                                <Link to="/" preload={false}>
                                    <ArrowLeft className="size-4" />
                                    {t("error.returnHome")}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}

export function OrganizationShowcaseDevErrorPage({
    details,
}: OrganizationShowcaseDevErrorPageProps) {
    const stackFrames = parseStackFrames(details.stack)
    const primaryFrame = stackFrames[0] ?? null
    const errorLabel = details.status ? `${details.name} ${details.status}` : details.name
    const diagnosticText = buildDiagnosticText(details)
    const contextRows: ErrorContextRow[] = [
        details.context?.route ? { label: "Route", value: details.context.route } : null,
        details.context?.source ? { label: "Source", value: details.context.source } : null,
        details.context?.reason ? { label: "Reason", value: details.context.reason } : null,
        details.context?.slug ? { label: "Slug", value: details.context.slug } : null,
    ].filter(isErrorContextRow)

    return (
        <>
            <title>Organization showcase error</title>
            <main className="flex min-h-dvh items-center bg-ds-canvas px-4 py-8 text-ds-fg sm:px-8">
                <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-md bg-ds-surface shadow-dropdown">
                    <div className="space-y-8 p-4 sm:p-6">
                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <span className="inline-flex rounded-sm bg-ds-danger-soft px-3 py-1 font-medium font-mono text-ds-danger-text text-xs">
                                    {errorLabel}
                                </span>
                                <CopyDiagnosticsButton value={diagnosticText} />
                            </div>

                            <div className="space-y-3">
                                <h1 className="mt-4 font-semibold text-ds-danger-text text-xl">
                                    {details.message}
                                </h1>
                                {details.context?.reason && (
                                    <p className="text-base text-ds-danger-text">
                                        {details.context.reason}
                                    </p>
                                )}
                            </div>
                        </section>

                        <RouteContextPanel
                            rows={contextRows}
                            data={details.data}
                            primaryFrame={primaryFrame}
                        />

                        <CallStackList frames={stackFrames} />
                    </div>
                </section>
            </main>
        </>
    )
}

interface ErrorContextRow {
    label: string
    value: string
}

interface StackFrame {
    name: string
    location: string
}

function RouteContextPanel({
    rows,
    data,
    primaryFrame,
}: {
    rows: ErrorContextRow[]
    data: string | null
    primaryFrame: StackFrame | null
}) {
    const heading = primaryFrame?.location ?? "Route diagnostics"
    const formattedRows = rows.map(
        (row, index) =>
            `${String(index + 1).padStart(2, " ")} | ${row.label.padEnd(7)} ${row.value}`
    )
    const frameText = [...formattedRows, data ? `\nResponse data\n${data}` : null]
        .filter(Boolean)
        .join("\n")

    return (
        <section className="overflow-hidden rounded-md border border-ds-surface-border bg-ds-surface">
            <div className="flex items-center justify-between gap-3 border-ds-gray-900 border-b bg-ds-inverse-surface px-4 py-3">
                <p className="truncate font-mono text-ds-gray-100 text-sm">{heading}</p>
            </div>
            <div className="overflow-x-auto bg-ds-inverse-surface">
                {frameText ? (
                    <pre className="p-4 font-mono text-ds-gray-100 text-sm leading-7">
                        {frameText}
                    </pre>
                ) : (
                    <p className="p-4 text-ds-gray-100 text-sm">
                        This route error did not include diagnostic context.
                    </p>
                )}
            </div>
        </section>
    )
}

function CallStackList({ frames }: { frames: StackFrame[] }) {
    const visibleFrames = frames.slice(0, 12)

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 font-semibold text-ds-fg text-lg">
                    Call Stack
                    <span className="rounded-full bg-ds-canvas px-2 py-0.5 font-medium text-ds-fg text-xs">
                        {frames.length}
                    </span>
                </h2>
                {frames.length > visibleFrames.length && (
                    <p className="text-ds-fg-muted text-xs">
                        Showing first {visibleFrames.length} frames
                    </p>
                )}
            </div>

            {visibleFrames.length > 0 ? (
                <ol className="space-y-3">
                    {visibleFrames.map((frame, index) => (
                        <li key={`${frame.name}-${frame.location}-${index}`}>
                            <p className="font-medium font-mono text-ds-fg text-sm">{frame.name}</p>
                            {frame.location && (
                                <p className="mt-1 break-all font-mono text-ds-fg-muted text-xs">
                                    {frame.location}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="border border-ds-surface-border bg-ds-canvas p-4 text-ds-fg-muted text-sm">
                    No call stack was provided for this route error.
                </p>
            )}
        </section>
    )
}

function isErrorContextRow(row: ErrorContextRow | null): row is ErrorContextRow {
    return row !== null
}

function buildDiagnosticText(details: OrganizationShowcaseDevErrorDetails): string {
    const context = details.context ? JSON.stringify(details.context, null, 2) : null

    return [
        details.status ? `Status: ${details.status}` : null,
        `${details.name}: ${details.message}`,
        context ? `Context:\n${context}` : null,
        details.data ? `Data:\n${details.data}` : null,
        details.stack ? `Stack:\n${details.stack}` : null,
    ]
        .filter(Boolean)
        .join("\n\n")
}

function parseStackFrames(stack: string | null): StackFrame[] {
    if (!stack) return []

    return stack
        .split("\n")
        .slice(1)
        .map((line) => parseStackFrame(line.trim()))
        .filter((frame): frame is StackFrame => frame !== null)
}

function parseStackFrame(line: string): StackFrame | null {
    if (!line) return null

    const frame = line.startsWith("at ") ? line.slice(3) : line
    const namedFrameMatch = frame.match(/^(.*?)\s+\((.*)\)$/)

    if (namedFrameMatch) {
        const name = namedFrameMatch[1]?.trim() || "anonymous"
        const location = namedFrameMatch[2]?.trim() || ""

        return {
            name,
            location: formatStackLocation(location),
        }
    }

    return {
        name: "anonymous",
        location: formatStackLocation(frame),
    }
}

function formatStackLocation(location: string): string {
    const sourceIndex = location.indexOf("/src/")
    if (sourceIndex >= 0) return location.slice(sourceIndex + 1)

    return location
}

function CopyDiagnosticsButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full border border-ds-surface-border bg-ds-surface p-2 text-ds-fg-muted transition-colors hover:border-ds-surface-border hover:bg-ds-surface-interactive"
            title="Copy error details to clipboard"
            aria-label="Copy error details to clipboard"
        >
            {copied ? (
                <Check className="size-3.5 stroke-[2.5]" />
            ) : (
                <Copy className="size-3.5 stroke-[2.5]" />
            )}
        </button>
    )
}
