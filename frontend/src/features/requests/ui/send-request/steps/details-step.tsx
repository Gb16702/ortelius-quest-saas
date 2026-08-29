import { useId } from "react"
import { Checkbox } from "@/shared/ui/checkbox"
import { Dropzone } from "@/shared/ui/dropzone"
import {
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/shared/ui/field"
import { FileList } from "@/shared/ui/file-list"
import { FormGroup } from "@/shared/ui/form-group"
import { Input } from "@/shared/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { Textarea } from "@/shared/ui/textarea"
import { REQUEST_DOCUMENT_FILE_CONFIG } from "../../../lib/request-document-upload.config"
import { useRequestDocumentUpload } from "../../../model/hooks/use-request-document-upload"
import { useSendRequestStore } from "../../../model/use-send-request.store"

interface CheckboxOptionProps {
    id: string
    label: string
    description: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
}

function CheckboxOption({ id, label, description, checked, onCheckedChange }: CheckboxOptionProps) {
    return (
        <FieldLabel
            htmlFor={id}
            className="flex w-full cursor-pointer items-start gap-3 rounded-sm border border-ds-surface-border p-3 transition-colors hover:border-ds-surface-border has-[[data-state=checked]]:border-ds-accent-700"
        >
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(state) => onCheckedChange(!!state)}
                className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
                <span className="font-medium text-ds-fg text-sm">{label}</span>
                <span className="font-normal text-ds-fg-muted text-xs">{description}</span>
            </div>
        </FieldLabel>
    )
}

export const DetailsStep = () => {
    const cargoLengthId = useId()
    const cargoWidthId = useId()
    const cargoHeightId = useId()
    const cargoVolumeId = useId()
    const cargoWeightId = useId()
    const palletCountId = useId()
    const cargoFragilityId = useId()
    const hazardousMaterialsId = useId()
    const insuranceCoverageId = useId()
    const perishableItemsId = useId()
    const descriptionId = useId()
    const { data, errors, updateData } = useSendRequestStore()

    const { uploadFiles, removeFile } = useRequestDocumentUpload({
        existingFiles: data.documents || [],
        onFilesUpdate: (files) => updateData({ documents: files }),
    })

    return (
        <div className="flex w-full flex-col gap-y-5 p-0.5">
            <div className="grid grid-cols-3 gap-3">
                <FormGroup data-invalid={!!errors.length}>
                    <FieldLabel htmlFor={cargoLengthId}>Length (m)</FieldLabel>
                    <Input
                        id={cargoLengthId}
                        size="sm"
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        aria-invalid={!!errors.length}
                        value={data.length || ""}
                        onChange={(e) => updateData({ length: e.target.value })}
                    />
                    {errors.length && <FieldError>{errors.length}</FieldError>}
                </FormGroup>
                <FormGroup data-invalid={!!errors.width}>
                    <FieldLabel htmlFor={cargoWidthId}>Width (m)</FieldLabel>
                    <Input
                        id={cargoWidthId}
                        size="sm"
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        aria-invalid={!!errors.width}
                        value={data.width || ""}
                        onChange={(e) => updateData({ width: e.target.value })}
                    />
                    {errors.width && <FieldError>{errors.width}</FieldError>}
                </FormGroup>
                <FormGroup data-invalid={!!errors.height}>
                    <FieldLabel htmlFor={cargoHeightId}>Height (m)</FieldLabel>
                    <Input
                        id={cargoHeightId}
                        size="sm"
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        aria-invalid={!!errors.height}
                        value={data.height || ""}
                        onChange={(e) => updateData({ height: e.target.value })}
                    />
                    {errors.height && <FieldError>{errors.height}</FieldError>}
                </FormGroup>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <FormGroup data-invalid={!!errors.volume}>
                    <FieldLabel htmlFor={cargoVolumeId}>Volume (m³)</FieldLabel>
                    <Input
                        id={cargoVolumeId}
                        size="sm"
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        aria-invalid={!!errors.volume}
                        value={data.volume || ""}
                        onChange={(e) => updateData({ volume: e.target.value })}
                    />
                    {errors.volume && <FieldError>{errors.volume}</FieldError>}
                </FormGroup>
                <FormGroup data-invalid={!!errors.weight}>
                    <FieldLabel htmlFor={cargoWeightId}>Weight (ton)</FieldLabel>
                    <Input
                        id={cargoWeightId}
                        size="sm"
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        aria-invalid={!!errors.weight}
                        value={data.weight || ""}
                        onChange={(e) => updateData({ weight: e.target.value })}
                    />
                    {errors.weight && <FieldError>{errors.weight}</FieldError>}
                </FormGroup>
                <FormGroup data-invalid={!!errors.palletCount}>
                    <FieldLabel htmlFor={palletCountId}>Pallet count</FieldLabel>
                    <Input
                        id={palletCountId}
                        size="sm"
                        type="number"
                        placeholder="0"
                        min={0}
                        step={1}
                        aria-invalid={!!errors.palletCount}
                        value={data.palletCount || ""}
                        onChange={(e) => updateData({ palletCount: e.target.value })}
                    />
                    {errors.palletCount && <FieldError>{errors.palletCount}</FieldError>}
                </FormGroup>
            </div>

            <Select
                value={data.fragility}
                onValueChange={(value) => updateData({ fragility: value })}
            >
                <SelectTrigger id={cargoFragilityId} className="w-full" size="default">
                    <SelectValue placeholder="Select fragility level" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="fragile">Fragile</SelectItem>
                    <SelectItem value="robust">Robust</SelectItem>
                </SelectContent>
            </Select>

            <FieldSet className="gap-3">
                <FieldLegend className="sr-only" variant="label">
                    Cargo options
                </FieldLegend>
                <FieldGroup data-slot="checkbox-group" className="gap-3">
                    <CheckboxOption
                        id={hazardousMaterialsId}
                        label="Hazardous materials"
                        description="Cargo contains dangerous goods"
                        checked={data.hazardous || false}
                        onCheckedChange={(checked) => updateData({ hazardous: checked })}
                    />
                    <CheckboxOption
                        id={insuranceCoverageId}
                        label="Insurance coverage"
                        description="Requires insurance for this shipment"
                        checked={data.insuranceCoverage || false}
                        onCheckedChange={(checked) => updateData({ insuranceCoverage: checked })}
                    />
                    <CheckboxOption
                        id={perishableItemsId}
                        label="Perishable items"
                        description="Cargo requires temperature control"
                        checked={data.perishableGoods || false}
                        onCheckedChange={(checked) => updateData({ perishableGoods: checked })}
                    />
                </FieldGroup>
            </FieldSet>

            <FormGroup>
                <FieldLabel htmlFor={descriptionId}>Additional comments</FieldLabel>
                <Textarea
                    id={descriptionId}
                    value={data.additionalInfo || ""}
                    onChange={(e) => updateData({ additionalInfo: e.target.value })}
                    placeholder="If desired, please share any additional comments."
                    className="h-26 w-full"
                />
            </FormGroup>

            <FormGroup>
                <Dropzone
                    onDrop={uploadFiles}
                    accept={REQUEST_DOCUMENT_FILE_CONFIG.accept}
                    maxSize={REQUEST_DOCUMENT_FILE_CONFIG.maxSize}
                    maxFiles={REQUEST_DOCUMENT_FILE_CONFIG.maxFiles}
                    showFiles={false}
                />
                <FieldDescription>Up to 5 PDF files, 10 MB each</FieldDescription>
                <div className="space-y-2">
                    <FileList files={data.documents || []} onRemoveFile={removeFile} />
                </div>
            </FormGroup>
        </div>
    )
}
