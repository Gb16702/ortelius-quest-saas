import { Eye, EyeOff } from "lucide-react"
import { type FormEvent, useEffect, useId, useState } from "react"
import type { AuthSignInActionData } from "@/features/auth"
import { Button } from "@/shared/ui/button"
import { FieldError, FieldLabel } from "@/shared/ui/field"
import { FormGroup } from "@/shared/ui/form-group"
import { Input } from "@/shared/ui/input"

interface AuthSignInPageProps {
    email: string
    actionData: AuthSignInActionData
    isLoading: boolean
    formAction?: string
    onNavigate?: (href: string) => void
    onSubmit?: (formData: FormData) => void | Promise<void>
}

function defaultNavigate(href: string) {
    if (typeof window === "undefined") return
    window.location.assign(href)
}

export function AuthSignInPage({
    email,
    actionData,
    isLoading,
    formAction,
    onNavigate = defaultNavigate,
    onSubmit,
}: AuthSignInPageProps) {
    const emailId = useId()
    const passwordId = useId()
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (actionData?.mfa && actionData.session && actionData.username) {
            onNavigate(
                `/mfa?session=${encodeURIComponent(actionData.session)}&username=${encodeURIComponent(actionData.username)}`
            )
        }
    }, [actionData, onNavigate])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        if (!onSubmit) return

        event.preventDefault()
        setIsSubmitting(true)

        try {
            await onSubmit(new FormData(event.currentTarget))
        } finally {
            setIsSubmitting(false)
        }
    }

    const error = actionData?.error ?? null
    const pending = isLoading || isSubmitting

    return (
        <div className="flex w-full max-w-sm flex-col gap-8">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <h1 className="font-semibold text-2xl text-ds-fg">Sign in to your account</h1>
                </div>
            </div>

            <form
                action={formAction}
                method="post"
                className="flex flex-col gap-4"
                onSubmit={handleSubmit}
            >
                <FormGroup>
                    <FieldLabel htmlFor={emailId}>Email</FieldLabel>
                    <Input
                        id={emailId}
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        defaultValue={email}
                    />
                </FormGroup>

                <FormGroup>
                    <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
                    <div className="relative">
                        <Input
                            id={passwordId}
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                            className="pr-12"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            radius="full"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute top-1/2 right-1 -translate-y-1/2 text-ds-fg-muted"
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                </FormGroup>

                {error && <FieldError>{error}</FieldError>}

                <Button type="submit" variant="brand" size="lg" radius="full" disabled={pending}>
                    {pending ? "Signing in…" : "Sign in"}
                </Button>
            </form>
        </div>
    )
}
