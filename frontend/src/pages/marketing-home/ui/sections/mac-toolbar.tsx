import type { ReactNode } from "react"

interface MacToolbarProps {
    title?: string
    children: ReactNode
}

export function MacToolbar({ title = "your-company.ortelius.app", children }: MacToolbarProps) {
    return (
        <div
            className="overflow-hidden rounded-md bg-ds-surface"
            style={{
                boxShadow:
                    "0 2px 3px rgb(0 0 0 / 0.04), 0 24px 68px rgb(47 48 55 / 0.05), 0 4px 6px rgb(34 42 53 / 0.04), 0 0 0 1px rgb(34 42 53 / 0.05), 0 1px 1px rgb(0 0 0 / 0.05)",
            }}
        >
            <div className="relative flex gap-x-1 border-ds-surface-border/75 border-b px-2 py-2">
                <div className="absolute inset-0 flex items-center justify-center font-medium text-[0.625rem] text-ds-fg">
                    {title}
                </div>
                <div className="size-2 flex-none rounded-full bg-ds-gray-400 ring-1 ring-ds-gray-500/65 ring-inset" />
                <div className="size-2 flex-none rounded-full bg-ds-gray-400 ring-1 ring-ds-gray-500/65 ring-inset" />
                <div className="size-2 flex-none rounded-full bg-ds-gray-400 ring-1 ring-ds-gray-500/65 ring-inset" />
            </div>
            {children}
        </div>
    )
}
