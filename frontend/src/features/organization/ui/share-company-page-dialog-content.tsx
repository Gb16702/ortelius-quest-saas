import { Check, Copy } from "lucide-react"
import Papa from "papaparse"
import { type FormEvent, useEffect, useRef, useState } from "react"
import { readJsonResponse } from "@/shared/api/http.response"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"
import { DialogAction, DialogBody, DialogCancel, DialogFooter } from "@/shared/ui/dialog"
import { Dropzone } from "@/shared/ui/dropzone"
import { FieldDescription, FieldError } from "@/shared/ui/field"
import { FormGroup } from "@/shared/ui/form-group"
import { Spinner } from "@/shared/ui/spinner"
import { TagInput } from "@/shared/ui/tag-input"
import {
    showErrorToast,
    showPromiseToast,
    showRetryErrorToast,
    showSuccessToast,
} from "@/shared/ui/toasts"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip"
import { shareCompanyPageInvitationsResponseSchema } from "../model/schemas/share-company-page.schema"

interface ShareCompanyPageDialogContentProps {
    isOpen: boolean
    onClose: () => void
    currentUrl?: string
    organizationId?: string
    organizationSlug?: string
}

export function ShareCompanyPageDialogContent({
    isOpen,
    onClose,
    currentUrl,
    organizationId,
    organizationSlug,
}: ShareCompanyPageDialogContentProps) {
    const [emails, setEmails] = useState<string[]>([])
    const [emailError, setEmailError] = useState<string | null>(null)
    const [isCopying, setIsCopying] = useState(false)
    const [isCheckmarkVisible, setIsCheckmarkVisible] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const checkmarkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const MAX_EMAILS = 100

    const computeBaseUrl = () => {
        const slugPath = organizationSlug ? `/org/${organizationSlug}` : "/"
        if (currentUrl) {
            try {
                const url = new URL(currentUrl)
                return `${url.protocol}//${url.host}${slugPath}`
            } catch {
                return slugPath
            }
        }
        if (typeof window !== "undefined") {
            return `${window.location.protocol}//${window.location.host}${slugPath}`
        }
        return `https://localhost:3000${slugPath}`
    }

    const baseUrl = computeBaseUrl()

    const showCopySuccess = () => {
        showSuccessToast("Link copied to clipboard")
        setIsCheckmarkVisible(true)

        if (checkmarkTimeoutRef.current) {
            clearTimeout(checkmarkTimeoutRef.current)
        }

        checkmarkTimeoutRef.current = setTimeout(() => {
            setIsCheckmarkVisible(false)
            checkmarkTimeoutRef.current = null
        }, 3000)
    }

    const copyWithExecCommand = (value: string) => {
        const textarea = document.createElement("textarea")
        textarea.value = value
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        try {
            return document.execCommand("copy")
        } finally {
            document.body.removeChild(textarea)
        }
    }

    const copyLinkToClipboard = async () => {
        setIsCopying(true)
        try {
            await navigator.clipboard.writeText(baseUrl)
            showCopySuccess()
        } catch {
            try {
                if (copyWithExecCommand(baseUrl)) {
                    showCopySuccess()
                } else {
                    showRetryErrorToast("Failed to copy link", { onRetry: copyLinkToClipboard })
                }
            } catch {
                showRetryErrorToast("Failed to copy link", { onRetry: copyLinkToClipboard })
            }
        } finally {
            setIsCopying(false)
        }
    }

    const sendInvitations = async () => {
        const response = await fetch(`/api/organizations/${organizationId}/showcase/invitations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                emails: emails,
            }),
        })

        const json = await readJsonResponse(response)
        const result = safeParseSchema(shareCompanyPageInvitationsResponseSchema, json)

        if (!result.success) {
            throw new Error("Invalid invitation response")
        }

        if (!response.ok || !result.data.success || !result.data.data) {
            throw new Error(result.data.message || "Failed to send invitations")
        }

        return result.data.data
    }

    const sendEmails = async (e?: FormEvent) => {
        if (e) e.preventDefault()

        if (emails.length === 0) {
            setEmailError("Add at least one email address before sending.")
            return
        }
        if (!organizationId) {
            showErrorToast("Organization not found")
            return
        }

        const emailCount = emails.length
        setEmailError(null)

        const promise = sendInvitations()
        showPromiseToast(promise, {
            loading: `Sending ${emailCount} email${emailCount > 1 ? "s" : ""}...`,
            success: (data: { sent: number; failed: number }) => {
                const { sent, failed } = data
                if (sent > 0) {
                    onClose()
                    setEmails([])
                }
                if (sent > 0 && failed === 0) {
                    return `Sent ${sent} email${sent > 1 ? "s" : ""}`
                }
                if (sent > 0 && failed > 0) {
                    return `Sent ${sent} email${sent > 1 ? "s" : ""} (${failed} failed)`
                }
                return "Emails processed"
            },
            error: (error: unknown) =>
                error instanceof Error && error.message ? error.message : "Failed to send emails",
        })
        promise.catch(() => {})
    }

    const importFromFile = (file: File) => {
        if (!file.name.endsWith(".csv")) {
            showErrorToast("Please upload a CSV file")
            return
        }

        setIsImporting(true)

        Papa.parse(file, {
            complete: (results) => {
                try {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    const extractedEmails = new Set<string>()

                    results.data.forEach((row) => {
                        if (Array.isArray(row)) {
                            row.forEach((cell) => {
                                const cellStr = String(cell).trim()
                                if (emailRegex.test(cellStr)) {
                                    extractedEmails.add(cellStr.toLowerCase())
                                }
                            })
                        } else if (typeof row === "object" && row !== null) {
                            Object.values(row).forEach((cell) => {
                                const cellStr = String(cell).trim()
                                if (emailRegex.test(cellStr)) {
                                    extractedEmails.add(cellStr.toLowerCase())
                                }
                            })
                        }
                    })

                    const newEmails = Array.from(extractedEmails).filter(
                        (email) => !emails.includes(email)
                    )

                    if (newEmails.length === 0) {
                        showErrorToast("No valid email addresses found in CSV")
                        return
                    }

                    const totalEmails = emails.length + newEmails.length
                    if (totalEmails > MAX_EMAILS) {
                        const allowedCount = MAX_EMAILS - emails.length
                        const limitedEmails = newEmails.slice(0, allowedCount)
                        setEmails([...emails, ...limitedEmails])
                        showSuccessToast(
                            `Imported ${limitedEmails.length} emails (limit of ${MAX_EMAILS} reached)`
                        )
                    } else {
                        setEmails([...emails, ...newEmails])
                        showSuccessToast(`Imported ${newEmails.length} email addresses`)
                    }
                } catch (error) {
                    console.error("CSV parsing error:", error)
                    showErrorToast("Failed to parse CSV file")
                } finally {
                    setIsImporting(false)
                }
            },
            error: (error) => {
                console.error("CSV parsing error:", error)
                showErrorToast("Failed to read CSV file")
                setIsImporting(false)
            },
        })
    }

    useEffect(() => {
        if (!isOpen) {
            setIsCheckmarkVisible(false)
            if (checkmarkTimeoutRef.current) {
                clearTimeout(checkmarkTimeoutRef.current)
                checkmarkTimeoutRef.current = null
            }
        }
    }, [isOpen])

    useEffect(() => {
        return () => {
            if (checkmarkTimeoutRef.current) {
                clearTimeout(checkmarkTimeoutRef.current)
            }
        }
    }, [])

    const closeModal = () => {
        onClose()
        setEmails([])
        setEmailError(null)
        setIsImporting(false)
    }

    const handleEmailsChange = (next: string[]) => {
        setEmails(next)
        if (emailError && next.length > 0) {
            setEmailError(null)
        }
    }

    return (
        <>
            <DialogBody className="space-y-8 bg-ds-canvas">
                <div>
                    <div className="flex h-[44px] w-full items-center justify-between gap-x-2">
                        <div className="flex h-full w-full items-center justify-between rounded-sm border border-ds-surface-border bg-ds-surface px-2">
                            <div className="flex-1 break-all pr-2 font-mono text-ds-fg text-sm">
                                {baseUrl}
                            </div>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        radius="sm"
                                        size="sm"
                                        variant="outline"
                                        onClick={copyLinkToClipboard}
                                        disabled={isCopying}
                                        aria-label={
                                            isCheckmarkVisible ? "Link copied" : "Copy link"
                                        }
                                        className="!h-[44px] !p-0 w-[44px] shrink-0"
                                    >
                                        {isCopying ? (
                                            <Spinner className="!w-4 !h-4" aria-hidden="true" />
                                        ) : isCheckmarkVisible ? (
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <Copy className="h-4 w-4" aria-hidden="true" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isCheckmarkVisible ? "Link copied" : "Copy link"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <h3 className="font-medium text-ds-fg text-sm">Send emails</h3>
                    </div>

                    <Dropzone
                        onDrop={(acceptedFiles) => {
                            if (acceptedFiles.length > 0) {
                                importFromFile(acceptedFiles[0])
                            }
                        }}
                        accept={{
                            "text/csv": [".csv"],
                        }}
                        maxFiles={1}
                        disabled={isImporting}
                        title={isImporting ? "Importing..." : "Import from CSV"}
                        description={isImporting ? "Processing your file..." : undefined}
                    />

                    <FormGroup data-invalid={!!emailError}>
                        <TagInput
                            value={emails}
                            onChange={handleEmailsChange}
                            placeholder="Add email addresses, comma or enter separated"
                            disabled={isImporting}
                            maxTags={MAX_EMAILS}
                            validator={(email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                        />
                        {emailError ? (
                            <FieldError>{emailError}</FieldError>
                        ) : (
                            <FieldDescription>
                                Maximum {MAX_EMAILS} email addresses.
                            </FieldDescription>
                        )}
                    </FormGroup>
                </div>
            </DialogBody>

            <DialogFooter>
                <DialogCancel size="lg" onClick={closeModal}>
                    Close
                </DialogCancel>

                <DialogAction variant="solid" size="lg" onClick={sendEmails} disabled={isImporting}>
                    Send emails
                </DialogAction>
            </DialogFooter>
        </>
    )
}
