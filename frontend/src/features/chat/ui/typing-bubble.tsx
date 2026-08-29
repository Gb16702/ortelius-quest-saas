import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { LoadingDots } from "@/shared/ui/loading-dots"

interface SenderInfo {
    type: "organization" | "user"
    id: string
    name: string
    logo?: string | null
    image?: string | null
}

interface TypingBubbleProps {
    senderInfo: SenderInfo
}

export function TypingBubble({ senderInfo }: TypingBubbleProps) {
    const resolveAvatarSource = () => {
        if (senderInfo.type === "organization") {
            return senderInfo.logo
        }
        return senderInfo.image
    }

    return (
        <div className="mb-6 flex w-full justify-start">
            <div className="-ml-14 flex-shrink-0">
                <GeneratedAvatar
                    src={resolveAvatarSource()}
                    alt={senderInfo.name}
                    fallbackText={senderInfo.name}
                    size="lg"
                />
            </div>
            <div className="w-[60px]">
                <div className="flex h-full items-center justify-center gap-2">
                    <LoadingDots />
                </div>
            </div>
        </div>
    )
}
