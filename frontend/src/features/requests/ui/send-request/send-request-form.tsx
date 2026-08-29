import { useQueryClient } from "@tanstack/react-query"
import { Check, ChevronRight, X } from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/shared/lib/class-names"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"
import { Collapsible, CollapsibleContent } from "@/shared/ui/collapsible"
import { Spinner } from "@/shared/ui/spinner"
import { showErrorToast } from "@/shared/ui/toasts"
import { requestsKeys } from "../../api/requests.api"
import { submitSendRequest, uploadRequestDocuments } from "../../api/send-request.api"
import {
    type SendRequestContact,
    useSendRequestContact,
} from "../../model/hooks/use-send-request-contact"
import type { StepRef } from "../../model/request"
import {
    type SendRequestPayload,
    sendRequestPayloadSchema,
} from "../../model/schemas/send-request.schema"
import { useSendRequestStore } from "../../model/use-send-request.store"
import { RequestSuccessDialog } from "./request-success-dialog"
import { StepContentRouter } from "./steps/step-content-router"

const STEPS = [
    { id: 1, label: "Contact Information" },
    { id: 2, label: "Cargo type" },
    { id: 3, label: "Services" },
    { id: 4, label: "Details" },
]

type StepStatus = "completed" | "current" | "future"

interface StepIndicatorProps {
    stepNumber: number
    status: StepStatus
}

function StepIndicator({ stepNumber, status }: StepIndicatorProps) {
    if (status === "completed") {
        return (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ds-surface-border bg-ds-surface">
                <Check className="h-3.5 w-3.5 text-ds-fg" strokeWidth={3} />
            </div>
        )
    }

    if (status === "current") {
        return (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ds-surface-border bg-ds-surface">
                <ChevronRight className="h-3.5 w-3.5 text-ds-fg" strokeWidth={3} />
            </div>
        )
    }

    return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ds-surface-border bg-ds-surface">
            <span className="font-medium text-ds-fg-muted text-xs">{stepNumber}</span>
        </div>
    )
}

interface SendRequestFormProps {
    subdomain: string
    receiverOrganizationId: string | null
    initialStep: number
    loginUrl?: string
    onClose?: () => void
    onSuccess: (contactData: { firstName: string; lastName: string; email: string }) => void
}

type SendRequestDraftData = ReturnType<typeof useSendRequestStore.getState>["data"]
type SubmittedContactData = {
    firstName: string
    lastName: string
    email: string
}

function collectFieldErrors(
    issues: Array<{ path: Array<string | number>; message: string }>
): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const issue of issues) {
        const fieldKey = String(issue.path.at(-1) ?? "")
        if (fieldKey && !(fieldKey in errors)) {
            errors[fieldKey] = issue.message
        }
    }
    return errors
}

function parseOptionalFloat(value: string | undefined): number | undefined {
    if (!value) return undefined
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
}

function parseOptionalInteger(value: string | undefined): number | undefined {
    if (!value) return undefined
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : undefined
}

function buildSendRequestPayload({
    contact,
    data,
    documentUrls,
    receiverOrganizationId,
}: {
    contact: SendRequestContact
    data: SendRequestDraftData
    documentUrls: string[]
    receiverOrganizationId: string | null
}): SendRequestPayload {
    return {
        requesterEmail: contact.email,
        requesterName: `${contact.firstName} ${contact.lastName}`.trim(),
        categories: data.selectedCategories || [],
        services: data.selectedServices || [],
        cargoDetails: {
            weight: parseOptionalFloat(data.weight),
            volume: parseOptionalFloat(data.volume),
            dimensions: {
                length: parseOptionalFloat(data.length),
                width: parseOptionalFloat(data.width),
                height: parseOptionalFloat(data.height),
            },
            palletCount: parseOptionalInteger(data.palletCount),
            fragility: data.fragility,
            options: {
                hazardous: data.hazardous || false,
                insuranceCoverage: data.insuranceCoverage || false,
                perishableGoods: data.perishableGoods || false,
            },
        },
        comments: data.additionalInfo,
        documents: documentUrls,
        fromDate: data.dateRange?.from || "",
        toDate: data.dateRange?.to || "",
        receiverOrganizationId,
    }
}

export function SendRequestForm({
    // biome-ignore lint/correctness/noUnusedFunctionParameters: parameter is part of externally-imposed component/hook props signature
    subdomain,
    receiverOrganizationId,
    initialStep,
    loginUrl,
    onClose,
    onSuccess,
}: SendRequestFormProps) {
    const queryClient = useQueryClient()
    const [, setStepParam] = useQueryState(
        "step",
        parseAsString.withOptions({ shallow: true, history: "replace" })
    )
    const { data, resetData, lastCompletedStep, markStepCompleted, setErrors, _hasHydrated } =
        useSendRequestStore()
    const contact = useSendRequestContact()
    const [currentStep, setCurrentStep] = useState(initialStep)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)
    const [submittedContactData, setSubmittedContactData] = useState<SubmittedContactData | null>(
        null
    )
    const stepRef = useRef<StepRef>(null)
    const isSubmitLockedRef = useRef(false)
    const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const containerRef = useRef<HTMLDivElement>(null)
    const pendingScrollRef = useRef<number | null>(null)
    const animationRef = useRef<number | null>(null)
    const [skipAnimation, setSkipAnimation] = useState(true)

    useEffect(() => {
        const skipAnimationFrame = requestAnimationFrame(() => setSkipAnimation(false))
        return () => cancelAnimationFrame(skipAnimationFrame)
    }, [])

    useEffect(() => {
        return () => {
            if (animationRef.current === null) return
            cancelAnimationFrame(animationRef.current)
            animationRef.current = null
        }
    }, [])

    useEffect(() => {
        if (!_hasHydrated) return
        const maxAllowed = Math.min(lastCompletedStep + 1, STEPS.length)
        if (currentStep > maxAllowed) {
            setCurrentStep(maxAllowed)
        }
    }, [_hasHydrated, lastCompletedStep, currentStep])

    useEffect(() => {
        if (!_hasHydrated) return

        void setStepParam(currentStep === 1 ? null : String(currentStep))
    }, [currentStep, _hasHydrated, setStepParam])

    const getStepStatus = (stepId: number): StepStatus => {
        if (stepId < currentStep && stepId <= lastCompletedStep) return "completed"
        if (stepId === currentStep) return "current"
        return "future"
    }

    const submitRequest = async () => {
        if (isSubmitLockedRef.current) return

        const contactData = {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
        }

        const preflightPayload = buildSendRequestPayload({
            contact,
            data,
            documentUrls: [],
            receiverOrganizationId,
        })
        const validation = safeParseSchema(sendRequestPayloadSchema, preflightPayload)
        if (!validation.success) {
            const fieldErrors = collectFieldErrors(validation.error.issues)
            setErrors(fieldErrors)
            const firstMessage =
                validation.error.issues[0]?.message ??
                "Please fix the highlighted fields before submitting."
            showErrorToast(firstMessage)
            return
        }

        isSubmitLockedRef.current = true
        setIsSubmitting(true)

        try {
            const documentUrls = data.documents?.length
                ? await uploadRequestDocuments(data.documents)
                : []

            await submitSendRequest({ ...validation.data, documents: documentUrls })

            resetData()
            setSubmittedContactData(contactData)
            queryClient.invalidateQueries({ queryKey: requestsKeys.all })
            setShowSuccessDialog(true)
        } catch (error) {
            console.error("Submit error:", error)
            showErrorToast("Failed to submit request. Please try again.")
        } finally {
            isSubmitLockedRef.current = false
            setIsSubmitting(false)
        }
    }

    const continueAfterSuccess = useCallback(() => {
        if (!submittedContactData) return

        setShowSuccessDialog(false)
        onSuccess(submittedContactData)
    }, [submittedContactData, onSuccess])

    const scrollToStep = useCallback((stepId: number) => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }

        const container = containerRef.current
        if (!container) return

        const targetTop =
            stepId === 1
                ? 0
                : (() => {
                      const el = stepRefs.current.get(stepId)
                      if (!el) return null
                      const containerRect = container.getBoundingClientRect()
                      const elRect = el.getBoundingClientRect()
                      return elRect.top - containerRect.top + container.scrollTop - 8
                  })()

        if (targetTop === null) return
        const startTop = container.scrollTop
        const distance = targetTop - startTop

        if (Math.abs(distance) < 1) return

        const duration = 600
        let start: number | null = null

        const easeInOutCubic = (t: number): number =>
            t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

        const animate = (timestamp: number) => {
            if (!start) start = timestamp
            const elapsed = timestamp - start
            const progress = Math.min(elapsed / duration, 1)

            container.scrollTop = startTop + distance * easeInOutCubic(progress)

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                animationRef.current = null
            }
        }

        animationRef.current = requestAnimationFrame(animate)
    }, [])

    const handleCollapsibleAnimationEnd = useCallback(
        (stepId: number, event: React.AnimationEvent) => {
            if (event.animationName !== "collapsible-down") return
            if (pendingScrollRef.current !== stepId) return
            pendingScrollRef.current = null
            scrollToStep(stepId)
        },
        [scrollToStep]
    )

    const goToNextStep = async () => {
        const isValid = (await stepRef.current?.validate()) ?? true
        if (!isValid) return

        if (currentStep === STEPS.length) {
            if (isSubmitting) return
            await submitRequest()
        } else {
            const nextStep = Math.min(currentStep + 1, STEPS.length)
            markStepCompleted(currentStep)
            pendingScrollRef.current = nextStep
            setCurrentStep(nextStep)
        }
    }

    const goToPreviousStep = () => {
        const prevStep = Math.max(currentStep - 1, 1)
        pendingScrollRef.current = prevStep
        setCurrentStep(prevStep)
    }

    return (
        <>
            <div className="flex h-full min-h-0 flex-col bg-ds-surface">
                <div className="shrink-0 bg-ds-surface px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="font-semibold text-ds-fg text-xl">Send a request</h2>
                            <p className="text-ds-fg-muted text-sm">
                                Fill in the details below to submit your shipping request.
                            </p>
                        </div>
                        {onClose && (
                            <Button
                                variant="outline"
                                radius="full"
                                size="icon"
                                onClick={onClose}
                                className="shrink-0"
                            >
                                <X className="size-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <div
                    ref={containerRef}
                    className="scroll-mask-y min-h-0 flex-1 overflow-y-auto px-6 pb-6"
                >
                    {STEPS.map((step, index) => {
                        const status = getStepStatus(step.id)
                        const isExpanded = step.id === currentStep
                        const isLast = index === STEPS.length - 1

                        return (
                            <div
                                key={step.id}
                                ref={(el) => {
                                    if (el) stepRefs.current.set(step.id, el)
                                }}
                            >
                                <Collapsible open={isExpanded}>
                                    <div className="rounded-md border border-ds-surface-border">
                                        {/* biome-ignore lint/a11y/noStaticElementInteractions: header is conditionally interactive based on step status; role/tabIndex applied dynamically */}
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 p-4",
                                                status !== "current" &&
                                                    step.id <= lastCompletedStep + 1 &&
                                                    "cursor-pointer rounded-md transition-colors hover:bg-ds-surface-hover"
                                            )}
                                            onClick={() => {
                                                if (
                                                    status !== "current" &&
                                                    step.id <= lastCompletedStep + 1
                                                ) {
                                                    pendingScrollRef.current = step.id
                                                    setCurrentStep(step.id)
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (
                                                    (e.key === "Enter" || e.key === " ") &&
                                                    status !== "current" &&
                                                    step.id <= lastCompletedStep + 1
                                                ) {
                                                    e.preventDefault()
                                                    pendingScrollRef.current = step.id
                                                    setCurrentStep(step.id)
                                                }
                                            }}
                                            role={
                                                status !== "current" &&
                                                step.id <= lastCompletedStep + 1
                                                    ? "button"
                                                    : undefined
                                            }
                                            tabIndex={
                                                status !== "current" &&
                                                step.id <= lastCompletedStep + 1
                                                    ? 0
                                                    : undefined
                                            }
                                        >
                                            <StepIndicator stepNumber={step.id} status={status} />
                                            <span className="font-medium">{step.label}</span>
                                        </div>

                                        <CollapsibleContent
                                            className={skipAnimation ? "!animate-none" : undefined}
                                            onAnimationEnd={(e) =>
                                                handleCollapsibleAnimationEnd(step.id, e)
                                            }
                                        >
                                            {isExpanded && (
                                                <div className="p-4">
                                                    <StepContentRouter
                                                        ref={stepRef}
                                                        step={step.id}
                                                        currentStep={currentStep}
                                                        organizationId={receiverOrganizationId}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between px-4 py-3">
                                                <div>
                                                    {step.id > 1 && (
                                                        <Button
                                                            variant="outline"
                                                            radius="full"
                                                            size="lg"
                                                            onClick={goToPreviousStep}
                                                        >
                                                            Back
                                                        </Button>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="solid"
                                                    radius="full"
                                                    size="lg"
                                                    onClick={goToNextStep}
                                                    disabled={
                                                        step.id === STEPS.length && isSubmitting
                                                    }
                                                >
                                                    {step.id === STEPS.length ? (
                                                        isSubmitting ? (
                                                            <div className="flex items-center gap-2">
                                                                <Spinner className="mr-2" />
                                                                <span>Submitting...</span>
                                                            </div>
                                                        ) : (
                                                            "Submit"
                                                        )
                                                    ) : (
                                                        "Continue"
                                                    )}
                                                </Button>
                                            </div>
                                        </CollapsibleContent>
                                    </div>
                                </Collapsible>

                                {!isLast && (
                                    <div className="flex justify-start pl-7">
                                        <div className="h-6 border-ds-control-border border-l border-dashed" />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {submittedContactData && (
                <RequestSuccessDialog
                    isOpen={showSuccessDialog}
                    contactData={submittedContactData}
                    loginUrl={loginUrl}
                    redirectPath="/me/requests"
                    onContinue={continueAfterSuccess}
                />
            )}
        </>
    )
}
