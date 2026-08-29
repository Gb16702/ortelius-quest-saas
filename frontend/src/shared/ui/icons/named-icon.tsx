import { ActivityLog } from "./activity-log"
import { Advanced } from "./advanced"
import { Analytics } from "./analytics"
import { Branding } from "./branding"
import { Chat } from "./chat"
import { InfinityIcon } from "./infinity"
import { Note } from "./note"
import { Paint } from "./paint"
import { Phone } from "./phone"
import { PricingIntelligence } from "./pricing-intelligence"
import { TeamChat } from "./team-chat"
import { Transcript } from "./transcript"

const NAMED_ICON_COMPONENTS = {
    "activity-log": ActivityLog,
    advanced: Advanced,
    analytics: Analytics,
    branding: Branding,
    chat: Chat,
    infinity: InfinityIcon,
    note: Note,
    paint: Paint,
    phone: Phone,
    "pricing-intelligence": PricingIntelligence,
    "team-chat": TeamChat,
    transcript: Transcript,
}

export type NamedIconName = keyof typeof NAMED_ICON_COMPONENTS

interface NamedIconProps {
    name: NamedIconName
    className?: string
}

export function NamedIcon({ name, className }: NamedIconProps) {
    const Icon = NAMED_ICON_COMPONENTS[name]
    return <Icon className={className} />
}
