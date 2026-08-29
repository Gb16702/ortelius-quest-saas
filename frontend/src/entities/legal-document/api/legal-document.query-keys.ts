export function legalDocumentsQueryKey(organizationId: string | null) {
    return ["legal-documents", organizationId] as const
}
