import { NotFoundState } from "@/shared/ui/not-found.state"

export function OrgWorkspaceNotFoundPage() {
    return (
        <main className="flex min-h-full flex-1 items-center justify-center px-6 py-12 text-ds-fg">
            <NotFoundState />
        </main>
    )
}
