import { Bolt, GalleryVerticalEnd, Globe, Inbox } from "lucide-react"
import type { ComponentProps } from "react"

type IconProps = ComponentProps<"svg">

function Base({ children, className, ...props }: IconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            {...props}
        >
            {children}
        </svg>
    )
}

// ── Main Menu ──────────────────────────────────────────

export function DashboardIcon(props: IconProps) {
    return <GalleryVerticalEnd aria-hidden="true" {...props} />
}

export function RequestsIcon(props: IconProps) {
    return <Inbox aria-hidden="true" {...props} />
}

// Chat — square speech bubble
export function ChatIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path d="M21 16a2 2 0 0 1-2 2H7.328a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 3 20.286V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Base>
    )
}

// Team — two people side by side
export function TeamIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path d="M14 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="8" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Base>
    )
}

export function SettingsIcon(props: IconProps) {
    return <Bolt aria-hidden="true" {...props} />
}

// ── Sub-items ──────────────────────────────────────────

// My Contributions — ascending line chart
export function ContributionsIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path d="M3 3v18h18" />
            <path d="M7 16l4-4 4 2 6-7" />
        </Base>
    )
}

// Organization Overview — building with windows and door
export function OrgOverviewIcon(props: IconProps) {
    return (
        <Base {...props}>
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M9 22v-8h6v8" />
            <line x1="8" y1="6" x2="8.01" y2="6" />
            <line x1="12" y1="6" x2="12.01" y2="6" />
            <line x1="16" y1="6" x2="16.01" y2="6" />
            <line x1="8" y1="10" x2="8.01" y2="10" />
            <line x1="12" y1="10" x2="12.01" y2="10" />
            <line x1="16" y1="10" x2="16.01" y2="10" />
        </Base>
    )
}

// Members — single person silhouette
export function MembersIcon(props: IconProps) {
    return (
        <Base {...props}>
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
        </Base>
    )
}

// Invitations — envelope with flap
export function InvitationsIcon(props: IconProps) {
    return (
        <Base {...props}>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </Base>
    )
}

// ── Quick Actions ──────────────────────────────────────

// Share Company Page — public company page
export function ShareCompanyPageIcon(props: IconProps) {
    return <Globe aria-hidden="true" {...props} />
}

// Invite Members — plus sign
export function InviteMembersIcon(props: IconProps) {
    return (
        <Base {...props}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </Base>
    )
}

// Activity — pulse line
export function ActivityIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
        </Base>
    )
}

// New Request — plus sign
export function NewRequestIcon(props: IconProps) {
    return (
        <Base {...props}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </Base>
    )
}
