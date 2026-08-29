import type { InviterData } from "@/entities/invitation"

interface InviterProfileCardProps {
    inviter: InviterData
}

export function InviterProfileCard({ inviter }: InviterProfileCardProps) {
    if (!inviter.name) return null

    return (
        <div className="absolute bottom-32 left-1/2 z-10 -translate-x-1/2 rotate-2">
            <div className="w-[528px] overflow-hidden rounded-3xl bg-ds-surface shadow-card">
                <div
                    className="h-28 w-full bg-ds-surface-interactive"
                    style={
                        inviter.dominantColor
                            ? { backgroundColor: inviter.dominantColor }
                            : undefined
                    }
                />
                <div className="relative px-4 pb-4">
                    <div className="-mt-10">
                        {inviter.image ? (
                            <img
                                src={inviter.image}
                                alt={inviter.name}
                                className="size-16 rounded-full border-[3px] border-ds-surface bg-ds-surface object-cover p-1"
                            />
                        ) : (
                            <div className="flex size-16 items-center justify-center rounded-full border-[3px] border-ds-surface bg-ds-gray-200 shadow-sm">
                                <span className="font-semibold text-ds-fg-muted text-lg">
                                    {inviter.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="mt-1.5">
                        <p className="font-semibold text-ds-fg text-sm">{inviter.name}</p>
                        {inviter.email && (
                            <p className="text-ds-fg-muted text-xs">{inviter.email}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
