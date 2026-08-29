import { useTranslation } from "react-i18next"
import { FieldDescription } from "@/shared/ui/field"
import { Textarea } from "@/shared/ui/textarea"
import { useMessageEdit } from "./message-edit.context"

export const MessageEditForm = () => {
    const { t } = useTranslation("chat")
    const {
        isEditMode,
        textareaRef,
        editContent,
        setEditContent,
        processEditKeyDown,
        isSaving,
        cancelEdit,
        saveEdit,
    } = useMessageEdit()

    if (!isEditMode) return null

    return (
        <div className="space-y-2">
            <Textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={processEditKeyDown}
                disabled={isSaving}
                className="min-h-[60px] resize-none text-sm"
                maxLength={5000}
            />
            <FieldDescription>
                {t("message.editEscape")}{" "}
                <button
                    type="button"
                    onClick={cancelEdit}
                    className="cursor-pointer text-ds-link hover:text-ds-link-hover hover:underline"
                >
                    {t("message.editCancel")}
                </button>
                {" • "}
                {t("message.editEnter")}{" "}
                <button
                    type="button"
                    onClick={saveEdit}
                    className="cursor-pointer text-ds-link hover:text-ds-link-hover hover:underline"
                >
                    {t("message.editSave")}
                </button>
            </FieldDescription>
        </div>
    )
}
