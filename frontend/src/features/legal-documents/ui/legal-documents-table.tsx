import { CloudDownload, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatUploadDate } from "@/shared/lib/date"
import { formatFileSize } from "@/shared/lib/file-size"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Skeleton } from "@/shared/ui/skeleton"
import type { LegalDocument } from "../model/legal-documents"
import { useLegalDocumentsContext } from "../model/legal-documents.provider"

interface LegalDocumentRowProps {
    document: LegalDocument
}

function LegalDocumentRow({ document: doc }: LegalDocumentRowProps) {
    const { t } = useTranslation("settings")
    const { actions } = useLegalDocumentsContext()

    return (
        <div className="flex w-full items-center justify-between border-ds-surface-border border-b px-4 py-4 transition-colors duration-150 last:border-b-0 hover:bg-ds-surface-hover">
            <button
                type="button"
                onClick={() => actions.download(doc)}
                className="flex min-w-0 flex-1 items-center text-left"
                aria-label={t("legalDocuments.table.downloadAria", { label: doc.label })}
            >
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ds-fg text-sm">
                        {doc.label}
                    </span>
                    <span className="block font-normal text-ds-fg-muted text-xs">
                        {t("legalDocuments.table.uploaded", {
                            date: formatUploadDate(doc.createdAt),
                        })}
                    </span>
                </span>

                <span className="hidden font-normal text-ds-fg-muted text-xs sm:block sm:px-4">
                    {formatFileSize(doc.sizeBytes)}
                </span>
            </button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ds-fg transition-colors duration-150 hover:bg-ds-surface-interactive"
                        aria-label={t("legalDocuments.table.actionsAria", { label: doc.label })}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => actions.download(doc)}>
                        <CloudDownload className="mr-1 size-4 text-ds-fg" />
                        {t("legalDocuments.table.download")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions.openRenameDialog(doc)}>
                        <Pencil className="mr-1 size-4 text-ds-fg" />
                        {t("legalDocuments.table.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => actions.openDeleteDialog(doc)}
                    >
                        <Trash2 className="mr-1 size-4" />
                        {t("legalDocuments.table.delete")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

function LegalDocumentsTableSkeleton() {
    return (
        <div className="overflow-hidden rounded-sm border border-ds-surface-border bg-ds-surface">
            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
                    key={index}
                    className="flex items-center justify-between border-ds-surface-border border-b px-4 py-4 last:border-b-0"
                >
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="hidden h-3 w-16 sm:mx-4 sm:block" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            ))}
        </div>
    )
}

export function LegalDocumentsTable() {
    const { t } = useTranslation("settings")
    const { state } = useLegalDocumentsContext()

    if (state.isLoading) {
        return (
            <div className="flex flex-col gap-3">
                <h2 className="font-medium text-ds-fg text-sm">
                    {t("legalDocuments.table.library")}
                </h2>
                <LegalDocumentsTableSkeleton />
            </div>
        )
    }
    if (state.documents.length === 0) return null

    return (
        <div className="flex flex-col gap-3">
            <h2 className="font-medium text-ds-fg text-sm">{t("legalDocuments.table.library")}</h2>
            <div className="overflow-hidden rounded-sm border border-ds-surface-border bg-ds-surface">
                {state.documents.map((doc) => (
                    <LegalDocumentRow key={doc.id} document={doc} />
                ))}
            </div>
        </div>
    )
}
