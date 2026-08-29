import { CircleMinus } from "lucide-react"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { legalDocumentLabelSchema } from "@/entities/legal-document"
import { formatFileSize } from "@/shared/lib/file-size"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/shared/ui/card"
import { Dropzone } from "@/shared/ui/dropzone"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { Spinner } from "@/shared/ui/spinner"
import { LEGAL_DOCUMENT_FILE_CONFIG } from "../lib/legal-document-upload.config"
import type { StagedFile } from "../model/legal-documents"
import { useLegalDocumentsContext } from "../model/legal-documents.provider"

const PRESET = LEGAL_DOCUMENT_FILE_CONFIG

interface StagedFileRowProps {
    staged: StagedFile
    onLabelChange: (id: string, label: string) => void
    onRemove: (id: string) => void
}

function StagedFileRow({ staged, onLabelChange, onRemove }: StagedFileRowProps) {
    const { t } = useTranslation("settings")
    const isLocked = staged.status === "uploading" || staged.status === "uploaded"
    const labelValidation = safeParseSchema(legalDocumentLabelSchema, staged.label)
    const labelError = labelValidation.success ? null : labelValidation.error.issues[0].message

    return (
        <Field
            data-invalid={labelError !== null || staged.status === "error"}
            className="gap-1 py-4"
        >
            <div className="flex items-center gap-4">
                <FieldLabel htmlFor={`legal-document-label-${staged.id}`} className="sr-only">
                    {t("legalDocuments.upload.labelFor", { filename: staged.file.name })}
                </FieldLabel>
                <Input
                    id={`legal-document-label-${staged.id}`}
                    size="sm"
                    value={staged.label}
                    onChange={(event) => onLabelChange(staged.id, event.target.value)}
                    disabled={isLocked}
                    placeholder={t("legalDocuments.upload.labelPlaceholder")}
                    aria-invalid={labelError !== null}
                    maxLength={255}
                    className="w-md"
                />
                <p className="ml-auto font-normal text-ds-fg-muted text-xs">
                    {formatFileSize(staged.file.size)}
                </p>
                <Button
                    radius="sm"
                    type="button"
                    variant="outline"
                    onClick={() => onRemove(staged.id)}
                    disabled={staged.status === "uploading"}
                    aria-label={t("legalDocuments.upload.removeFile", {
                        filename: staged.file.name,
                    })}
                    className="size-10 shrink-0"
                >
                    {staged.status === "uploading" ? (
                        <Spinner className="size-4" />
                    ) : (
                        <CircleMinus className="size-4" />
                    )}
                </Button>
            </div>

            {labelError ? (
                <FieldError>{labelError}</FieldError>
            ) : staged.status === "error" && staged.errorMessage ? (
                <FieldError>{staged.errorMessage}</FieldError>
            ) : null}
        </Field>
    )
}

export function LegalDocumentsUploadZone() {
    const { t } = useTranslation("settings")
    const { state, actions } = useLegalDocumentsContext()

    const handleDrop = useCallback(
        (accepted: File[]) => {
            actions.addStagedFiles(accepted)
        },
        [actions]
    )

    const validStagedCount = state.stagedFiles.filter(
        (staged) => staged.status === "queued" || staged.status === "error"
    ).length

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("legalDocuments.upload.title")}</CardTitle>
                <CardDescription>{t("legalDocuments.upload.description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                <Dropzone
                    onDrop={handleDrop}
                    accept={PRESET.accept}
                    maxSize={PRESET.maxSize}
                    maxFiles={PRESET.maxFiles}
                    showFiles={false}
                    title={t("legalDocuments.upload.dropzoneTitle")}
                    description={t("legalDocuments.upload.dropzoneDescription")}
                    activeDescription={t("legalDocuments.upload.dropzoneActive")}
                />

                {state.stagedFiles.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h2 className="font-medium text-ds-fg text-sm">
                            {t("legalDocuments.upload.queued")}
                        </h2>
                        <FieldGroup className="gap-0 overflow-hidden rounded-sm border border-ds-surface-border bg-ds-surface px-4">
                            {state.stagedFiles.map((staged) => (
                                <StagedFileRow
                                    key={staged.id}
                                    staged={staged}
                                    onLabelChange={actions.updateStagedLabel}
                                    onRemove={actions.removeStagedFile}
                                />
                            ))}
                        </FieldGroup>
                    </div>
                )}

                {state.validationError && <FieldError>{state.validationError}</FieldError>}
            </CardContent>
            <CardFooter className="justify-between">
                <FieldDescription>
                    {t("legalDocuments.upload.limit", {
                        count: PRESET.maxFiles,
                        size: formatFileSize(PRESET.maxSize),
                    })}
                </FieldDescription>
                <Button
                    type="button"
                    variant="solid"
                    size="md"
                    onClick={actions.submitStagedFiles}
                    disabled={state.isUploading}
                >
                    {state.isUploading ? (
                        <>
                            <Spinner className="mr-2" />
                            {t("legalDocuments.upload.uploading")}
                        </>
                    ) : validStagedCount > 0 ? (
                        t("legalDocuments.upload.uploadFiles", { count: validStagedCount })
                    ) : (
                        t("legalDocuments.upload.upload")
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
