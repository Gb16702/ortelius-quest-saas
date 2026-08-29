import { Button } from "@/shared/ui/button"
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogSeparator,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Note } from "@/shared/ui/note"

interface RequestSuccessDialogProps {
    isOpen: boolean
    contactData: {
        firstName: string
        lastName: string
        email: string
    }
    loginUrl?: string
    redirectPath?: string
    onContinue: () => void
}

function buildSignUpHref(
    loginUrl: string | undefined,
    email: string,
    redirectPath: string | undefined
): string | null {
    if (!loginUrl) return null
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const redirectUri = `${origin}${redirectPath ?? "/"}`
    const params = new URLSearchParams({ email, redirect_uri: redirectUri })
    return `${loginUrl.replace(/\/$/, "")}?${params.toString()}`
}

export function RequestSuccessDialog({
    isOpen,
    contactData,
    loginUrl,
    redirectPath,
    onContinue,
}: RequestSuccessDialogProps) {
    const handleSignUp = () => {
        const href = buildSignUpHref(loginUrl, contactData.email, redirectPath)
        if (href) {
            window.location.href = href
            return
        }
        onContinue()
    }

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Request submitted successfully</DialogTitle>
                    <DialogDescription className="sr-only">
                        Your request was submitted and a confirmation email was sent.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-5 border-ds-surface-border border-t text-center">
                    <p className="text-ds-fg text-sm leading-relaxed">
                        Your request has been submitted successfully. We will get back to you as
                        soon as possible.
                    </p>

                    <Note
                        type="info"
                        hasIcon={false}
                        label={
                            <>
                                A confirmation email has been sent to{" "}
                                <span className="font-medium">{contactData.email}</span>
                            </>
                        }
                    />

                    <DialogSeparator />

                    <div className="w-full space-y-5">
                        <p className="text-ds-fg text-sm leading-relaxed">
                            Sign up to track your request progress, communicate directly with
                            organizations, and manage future shipping needs.
                        </p>
                        <Button
                            variant={"solid"}
                            className="w-full"
                            size="lg"
                            radius="full"
                            onClick={handleSignUp}
                        >
                            Sign up
                        </Button>
                    </div>
                </DialogBody>
            </DialogContent>
        </Dialog>
    )
}
