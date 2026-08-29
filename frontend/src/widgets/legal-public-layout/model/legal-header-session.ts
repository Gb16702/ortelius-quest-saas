export interface LegalHeaderSessionUser {
    id: string
    email: string
    name: string
    image: string | null
}

export interface LegalHeaderSession {
    user: LegalHeaderSessionUser
}

export interface LegalHeaderSessionState {
    session: LegalHeaderSession | null
    activeOrgSlug: string | null
}
