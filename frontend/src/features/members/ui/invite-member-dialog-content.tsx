import { CircleMinus } from "lucide-react"
import { type FormEvent, useCallback, useId, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import * as v from "valibot"
import type { AssignableRole } from "@/entities/access"
import type { InviteForm } from "@/entities/invitation"
import { useUser } from "@/entities/session"
import { generateUUID } from "@/shared/lib/uuid"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"
import { DialogAction, DialogBody, DialogCancel, DialogFooter } from "@/shared/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup } from "@/shared/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group"
import { Note } from "@/shared/ui/note"
import { Spinner } from "@/shared/ui/spinner"
import { useMemberSubscriptionCapacity } from "../api/member-subscription-capacity.query"
import { RoleSelect } from "./role-select"

export interface InviteMemberDialogContentProps {
    onClose: () => void
    organizationId: string
    isInviting: boolean
    availableRoles: { value: AssignableRole; label: string }[]
    onInviteSubmit: (forms: InviteForm[]) => void | Promise<void>
}

interface InviteFormWithId extends InviteForm {
    id: string
}

const MAX_INVITES = 4
const emailSchema = v.pipe(v.string(), v.email("Invalid email address"))

export function InviteMemberDialogContent({
    onClose,
    organizationId,
    isInviting,
    availableRoles,
    onInviteSubmit,
}: InviteMemberDialogContentProps) {
    const { t } = useTranslation("team")
    const { t: tCommon } = useTranslation("common")
    const inviteFormId = useId()
    const user = useUser()
    const translatedRoles = useMemo(
        () =>
            availableRoles.map((role) => ({
                ...role,
                label: tCommon(`role.${role.value}`, { defaultValue: role.label }),
            })),
        [availableRoles, tCommon]
    )
    const { data: subscription } = useMemberSubscriptionCapacity(organizationId)
    const [invites, setInvites] = useState<InviteFormWithId[]>([
        { id: generateUUID(), email: "", role: "member" },
    ])
    const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})
    const formRef = useRef<HTMLFormElement>(null)

    const showSeatPricingNote =
        !!subscription &&
        subscription.hasActiveSubscription &&
        subscription.status !== "trialing" &&
        subscription.pricePerSeat > 0

    const isValidEmailFormat = (email: string) => {
        return safeParseSchema(emailSchema, email.trim()).success
    }

    const filterFilledInvites = useCallback(() => {
        return invites.filter((inv) => inv.email.trim() !== "")
    }, [invites])

    const closeDialog = () => {
        onClose()
        setInvites([{ id: generateUUID(), email: "", role: "member" }])
        setInviteErrors({})
    }

    const removeInviteRow = (id: string) => {
        if (invites.length > 1) {
            setInvites(invites.filter((inv) => inv.id !== id))
            setInviteErrors((prev) => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        }
    }

    const updateInvite = (id: string, field: "email" | "role", value: string) => {
        setInvites(invites.map((inv) => (inv.id === id ? { ...inv, [field]: value } : inv)))

        if (field === "email" && inviteErrors[id]) {
            setInviteErrors((prev) => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        }
    }

    const tryAutoExpand = (id: string, email: string) => {
        const isLastRow = invites[invites.length - 1]?.id === id
        const isValid = isValidEmailFormat(email)

        if (isValid && isLastRow && invites.length < MAX_INVITES) {
            setInvites((prev) => [...prev, { id: generateUUID(), email: "", role: "member" }])
        }
    }

    const validateEmail = (id: string, email: string, shouldAutoExpand = true) => {
        if (!email.trim()) {
            setInviteErrors((prev) => {
                const next = { ...prev }
                delete next[id]
                return next
            })
            return
        }

        if (!isValidEmailFormat(email)) {
            setInviteErrors((prev) => ({
                ...prev,
                [id]: t("inviteDialog.errors.invalidEmail"),
            }))
            return
        }

        if (user?.email?.toLowerCase() === email.toLowerCase().trim()) {
            setInviteErrors((prev) => ({
                ...prev,
                [id]: t("inviteDialog.errors.cannotInviteSelf"),
            }))
            return
        }

        const duplicate = invites.find(
            (inv) => inv.id !== id && inv.email.toLowerCase().trim() === email.toLowerCase().trim()
        )
        if (duplicate) {
            setInviteErrors((prev) => ({
                ...prev,
                [id]: t("inviteDialog.errors.duplicateEmail"),
            }))
            return
        }

        setInviteErrors((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
        })

        if (shouldAutoExpand) {
            tryAutoExpand(id, email)
        }
    }

    const focusInviteRow = (id: string) => {
        const target = formRef.current?.querySelector<HTMLInputElement>(
            `[data-invite-row="${id}"] input[type="email"]`
        )
        target?.focus()
    }

    const validateInviteRow = (
        invite: InviteFormWithId,
        emailsByRow: Map<string, string>
    ): string | null => {
        const trimmed = invite.email.trim()
        if (!trimmed) return null

        if (!isValidEmailFormat(trimmed)) {
            return t("inviteDialog.errors.invalidEmail")
        }
        if (user?.email?.toLowerCase() === trimmed.toLowerCase()) {
            return t("inviteDialog.errors.cannotInviteSelf")
        }
        const isDuplicate = Array.from(emailsByRow.entries()).some(
            ([id, email]) => id !== invite.id && email.toLowerCase() === trimmed.toLowerCase()
        )
        if (isDuplicate) {
            return t("inviteDialog.errors.duplicateEmail")
        }
        return null
    }

    const submitInvitations = async (e: FormEvent) => {
        e.preventDefault()

        const filled = filterFilledInvites()
        if (filled.length === 0) {
            const firstId = invites[0]?.id
            if (firstId) {
                setInviteErrors({
                    [firstId]: t("inviteDialog.errors.atLeastOneEmail"),
                })
                focusInviteRow(firstId)
            }
            return
        }

        const emailsByRow = new Map(filled.map((inv) => [inv.id, inv.email.trim()]))
        const nextErrors: Record<string, string> = {}
        for (const invite of filled) {
            const message = validateInviteRow(invite, emailsByRow)
            if (message) nextErrors[invite.id] = message
        }

        if (Object.keys(nextErrors).length > 0) {
            setInviteErrors(nextErrors)
            const firstInvalidId = Object.keys(nextErrors)[0]
            if (firstInvalidId) focusInviteRow(firstInvalidId)
            return
        }

        const formsToSubmit = filled.map(({ id, ...form }) => form)
        await onInviteSubmit(formsToSubmit)
        closeDialog()
    }

    return (
        <>
            <DialogBody>
                <form
                    ref={formRef}
                    id={inviteFormId}
                    onSubmit={submitInvitations}
                    className="flex flex-col gap-3"
                >
                    <FieldGroup className="gap-3">
                        {invites.map((invite) => (
                            <Field
                                key={invite.id}
                                data-invite-row={invite.id}
                                data-invalid={!!inviteErrors[invite.id]}
                                className="gap-1"
                            >
                                <div className="flex items-center gap-2">
                                    <InputGroup
                                        className={`h-11 flex-1 ${
                                            inviteErrors[invite.id]
                                                ? "border-ds-danger-border focus-within:ring-ds-danger-ring"
                                                : ""
                                        }`}
                                    >
                                        <InputGroupInput
                                            type="email"
                                            placeholder={t("inviteDialog.emailPlaceholder")}
                                            value={invite.email}
                                            onChange={(e) =>
                                                updateInvite(invite.id, "email", e.target.value)
                                            }
                                            onBlur={(e) => {
                                                const relatedTarget =
                                                    e.relatedTarget as HTMLElement | null
                                                const isClickingFormControl =
                                                    relatedTarget?.closest(
                                                        'button, [role="combobox"], [role="listbox"], [data-radix-select-trigger]'
                                                    )
                                                validateEmail(
                                                    invite.id,
                                                    invite.email,
                                                    !isClickingFormControl
                                                )
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault()
                                                    validateEmail(invite.id, invite.email)
                                                }
                                            }}
                                            aria-invalid={!!inviteErrors[invite.id]}
                                            disabled={isInviting}
                                            className="pl-3"
                                        />
                                        <InputGroupAddon align="inline-end" className="pr-1">
                                            <RoleSelect
                                                value={invite.role}
                                                onValueChange={(value) =>
                                                    updateInvite(invite.id, "role", value)
                                                }
                                                availableRoles={translatedRoles}
                                                disabled={isInviting}
                                                className="!bg-transparent !ring-0 !shadow-none h-8 w-fit border-0 font-normal text-ds-fg-muted"
                                                placeholder={t("inviteDialog.rolePlaceholder")}
                                            />
                                        </InputGroupAddon>
                                    </InputGroup>

                                    {invites.length > 1 && (
                                        <Button
                                            radius="sm"
                                            type="button"
                                            variant="outline"
                                            onClick={() => removeInviteRow(invite.id)}
                                            disabled={isInviting}
                                            className="size-11 shrink-0"
                                        >
                                            <CircleMinus className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                {inviteErrors[invite.id] && (
                                    <FieldError>{inviteErrors[invite.id]}</FieldError>
                                )}
                            </Field>
                        ))}
                    </FieldGroup>

                    <FieldDescription>{t("inviteDialog.validationHint")}</FieldDescription>
                </form>

                {showSeatPricingNote && subscription && (
                    <Note type="secondary" hasIcon={true} label={false} className="mt-4">
                        {t("inviteDialog.seatPricingNote", { price: subscription.pricePerSeat })}
                    </Note>
                )}
            </DialogBody>

            <DialogFooter>
                <DialogCancel size="lg" type="button" onClick={closeDialog}>
                    {t("inviteDialog.close")}
                </DialogCancel>
                <DialogAction
                    variant="solid"
                    size="lg"
                    type="submit"
                    form={inviteFormId}
                    disabled={isInviting}
                >
                    {isInviting ? (
                        <>
                            <Spinner className="mr-2" />
                            {t("inviteDialog.sending")}
                        </>
                    ) : (
                        t("inviteDialog.send")
                    )}
                </DialogAction>
            </DialogFooter>
        </>
    )
}
