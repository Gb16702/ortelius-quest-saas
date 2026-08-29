import * as v from "valibot"

export type AuthSignInActionData =
    | { error: string; mfa?: never; session?: never; username?: never }
    | { error?: never; mfa: true; session: string; username: string }
    | null
    | undefined

export interface SignInPageProps {
    actionData: AuthSignInActionData
    email: string
    formAction: string
}

export const signInPagePropsSchema = v.object({
    actionData: v.optional(
        v.nullable(
            v.union([
                v.object({ error: v.string() }),
                v.object({
                    mfa: v.literal(true),
                    session: v.string(),
                    username: v.string(),
                }),
            ])
        )
    ),
    email: v.string(),
    formAction: v.string(),
})
