import { FileText } from "lucide-react"
import { useState } from "react"
import type { LegalDocument } from "@/entities/legal-document"
import { Button } from "@/shared/ui/button"
import { FieldError } from "@/shared/ui/field"
import { LegalDocumentsSelectorDialog } from "./legal-documents-selector-dialog"

interface LegalDocumentsSelectorProps {
    documents: LegalDocument[]
    selectedIds: string[]
    onSelectedIdsChange: (selectedIds: string[]) => void
    isLoading: boolean
    showError: boolean
}

export function LegalDocumentsSelector({
    documents,
    selectedIds,
    onSelectedIdsChange,
    isLoading,
    showError,
}: LegalDocumentsSelectorProps) {
    const [dialogOpen, setDialogOpen] = useState(false)

    const selectedDocuments = documents.filter((doc) => selectedIds.includes(doc.id))
    const selectedCount = selectedDocuments.length
    const totalCount = documents.length

    const summaryText =
        selectedCount === 0
            ? "No documents attached"
            : selectedCount === totalCount
              ? `All ${totalCount} document${totalCount === 1 ? "" : "s"} attached`
              : `${selectedCount} of ${totalCount} documents attached`

    const previewLabels = selectedDocuments
        .slice(0, 3)
        .map((doc) => doc.label)
        .join(", ")
    const moreCount = Math.max(0, selectedCount - 3)

    return (
        <div className="space-y-2">
            <div className="flex items-start justify-between gap-3 rounded-sm border border-ds-surface-border bg-ds-surface px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 size-4 flex-shrink-0 text-ds-fg-muted" />
                    <div className="min-w-0 flex-1">
                        <p className="font-medium text-ds-fg text-sm leading-[1.5]">
                            {summaryText}
                        </p>
                        {selectedCount > 0 && (
                            <p className="mt-0.5 truncate text-ds-fg-muted text-xs">
                                {previewLabels}
                                {moreCount > 0 ? ` +${moreCount} more` : ""}
                            </p>
                        )}
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    radius="full"
                    onClick={() => setDialogOpen(true)}
                    disabled={isLoading || totalCount === 0}
                >
                    Edit selection
                </Button>
            </div>

            {showError && selectedCount === 0 && (
                <FieldError>Please attach at least one legal document to submit quote</FieldError>
            )}

            {dialogOpen && (
                <LegalDocumentsSelectorDialog
                    open={true}
                    onOpenChange={setDialogOpen}
                    documents={documents}
                    selectedIds={selectedIds}
                    onApply={onSelectedIdsChange}
                />
            )}
        </div>
    )
}
