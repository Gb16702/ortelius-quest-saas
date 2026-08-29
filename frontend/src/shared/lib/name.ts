export function formatSenderName(name: string | null | undefined): string {
    if (!name) return ""

    const nameParts = name.trim().split(/\s+/)

    if (nameParts.length === 1) {
        return nameParts[0]
    }

    const firstName = nameParts[0]
    const lastNameInitial = nameParts[nameParts.length - 1][0]
    return `${firstName} ${lastNameInitial}.`
}
