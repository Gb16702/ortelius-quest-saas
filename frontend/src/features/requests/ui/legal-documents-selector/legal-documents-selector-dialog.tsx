import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import * as v from "valibot"
import type { LegalDocument } from "@/entities/legal-document"
import { formatUploadDate } from "@/shared/lib/date"
import { formatFileSize } from "@/shared/lib/file-size"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import {
    Dialog,
    DialogAction,
    DialogBody,
    DialogCancel,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/shared/ui/empty"
import { FieldError } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { showSuccessToast } from "@/shared/ui/toasts"

const draftSelectionSchema = v.pipe(
    v.array(v.pipe(v.string(), v.uuid())),
    v.minLength(1, "Select at least one document.")
)

interface LegalDocumentsSelectorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    documents: LegalDocument[]
    selectedIds: string[]
    onApply: (selectedIds: string[]) => void
}

export function LegalDocumentsSelectorDialog({
    open,
    onOpenChange,
    documents,
    selectedIds,
    onApply,
}: LegalDocumentsSelectorDialogProps) {
    const [draft, setDraft] = useState<Set<string>>(() => new Set(selectedIds))
    const [query, setQuery] = useState("")
    const [validationError, setValidationError] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            setDraft(new Set(selectedIds))
            setQuery("")
            setValidationError(null)
        }
    }, [open, selectedIds])

    const filteredDocuments = useMemo(() => {
        const trimmed = query.trim().toLowerCase()
        if (!trimmed) return documents
        return documents.filter((doc) => doc.label.toLowerCase().includes(trimmed))
    }, [documents, query])

    const allFilteredSelected =
        filteredDocuments.length > 0 && filteredDocuments.every((doc) => draft.has(doc.id))

    const handleToggle = (id: string) => {
        setValidationError(null)
        setDraft((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const handleSelectAllVisible = () => {
        setValidationError(null)
        setDraft((prev) => {
            const next = new Set(prev)
            for (const doc of filteredDocuments) next.add(doc.id)
            return next
        })
    }

    const handleDeselectAllVisible = () => {
        setDraft((prev) => {
            const next = new Set(prev)
            for (const doc of filteredDocuments) next.delete(doc.id)
            return next
        })
    }

    const handleApply = () => {
        const result = safeParseSchema(draftSelectionSchema, Array.from(draft))
        if (!result.success) {
            setValidationError(result.error.issues[0]?.message ?? "Invalid selection.")
            return
        }
        setValidationError(null)
        onApply(result.data)
        onOpenChange(false)
        const count = result.data.length
        showSuccessToast(count === 1 ? "1 document attached" : `${count} documents attached`)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[640px] overflow-hidden">
                <DialogHeader className="border-ds-surface-border border-b">
                    <DialogTitle>Attach legal documents</DialogTitle>
                    <p className="text-ds-fg-muted text-sm leading-[1.5]">
                        Pick the documents to send alongside this quote.
                    </p>
                </DialogHeader>

                <DialogBody className="flex min-h-0 flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                            <Input
                                type="text"
                                placeholder="Search by name"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full pl-10"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                radius="full"
                                onClick={handleSelectAllVisible}
                                disabled={filteredDocuments.length === 0 || allFilteredSelected}
                            >
                                Select all
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                radius="full"
                                onClick={handleDeselectAllVisible}
                                disabled={
                                    filteredDocuments.length === 0 ||
                                    filteredDocuments.every((doc) => !draft.has(doc.id))
                                }
                            >
                                Deselect all
                            </Button>
                        </div>
                    </div>

                    {filteredDocuments.length === 0 ? (
                        <Empty className="flex-1">
                            <EmptyHeader>
                                <EmptyTitle>No documents match "{query}"</EmptyTitle>
                                <EmptyDescription>Try another search term.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div
                            className="rounded-sm border border-ds-surface-border bg-ds-surface"
                            style={{
                                flex: "1 1 0%",
                                minHeight: 0,
                                overflowY: "auto",
                                position: "relative",
                            }}
                            onWheel={(e) => {
                                e.currentTarget.scrollTop += e.deltaY
                                e.stopPropagation()
                            }}
                        >
                            <div className="divide-y divide-ds-surface-border">
                                {filteredDocuments.map((doc) => {
                                    const checked = draft.has(doc.id)
                                    return (
                                        <button
                                            key={doc.id}
                                            type="button"
                                            onClick={() => handleToggle(doc.id)}
                                            className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-ds-surface-hover"
                                            aria-pressed={checked}
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <Checkbox
                                                    checked={checked}
                                                    tabIndex={-1}
                                                    aria-label={`Toggle ${doc.label}`}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium text-ds-fg text-sm">
                                                        {doc.label}
                                                    </p>
                                                    <p className="font-normal text-ds-fg-muted text-xs">
                                                        Uploaded {formatUploadDate(doc.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="hidden font-normal text-ds-fg-muted text-xs sm:block sm:px-4">
                                                {formatFileSize(doc.sizeBytes)}
                                            </p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {validationError && <FieldError>{validationError}</FieldError>}
                </DialogBody>

                <DialogFooter>
                    <DialogClose asChild>
                        <DialogCancel>Cancel</DialogCancel>
                    </DialogClose>
                    <DialogAction onClick={handleApply}>Apply selection</DialogAction>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
