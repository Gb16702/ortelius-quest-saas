import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { AvatarGroup, type AvatarGroupMember } from "@/shared/ui/avatar-group"
import type { ReaderInfo } from "../model/hooks/use-message-read-status"

interface ReadReceiptsProps {
    readers: ReaderInfo[]
    maxVisible?: number
}

export const ReadReceipts = ({ readers, maxVisible = 3 }: ReadReceiptsProps) => {
    const { t } = useTranslation("chat")
    const uniqueMembers = useMemo(() => {
        if (readers.length === 0) return []

        const seenUserIds = new Set<string>()
        const members: AvatarGroupMember[] = []

        for (const reader of readers) {
            if (!seenUserIds.has(reader.userId)) {
                seenUserIds.add(reader.userId)
                members.push({
                    id: reader.userId,
                    name: reader.userName,
                    image: reader.userImage,
                    tooltip: t("readReceipts.seenBy", { name: reader.userName }),
                })
            }
        }

        return members
    }, [readers, t])

    if (uniqueMembers.length === 0) return null

    return <AvatarGroup members={uniqueMembers} size="sm" limit={maxVisible} className="mt-2" />
}
