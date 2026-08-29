import { useCallback, useEffect } from "react"
import { type LegalDocument, useLegalDocumentsList } from "@/entities/legal-document"
import type { QuoteData } from "../request"

interface UseLegalDocumentsSelectionParams {
    organizationId: string | null
    isEditMode: boolean
    setQuoteData: (updater: (prev: QuoteData) => QuoteData) => void
}

interface UseLegalDocumentsSelectionResult {
    documents: LegalDocument[]
    isLoading: boolean
    onSelectedIdsChange: (ids: string[]) => void
}

export function useLegalDocumentsSelection({
    organizationId,
    isEditMode,
    setQuoteData,
}: UseLegalDocumentsSelectionParams): UseLegalDocumentsSelectionResult {
    const { data, isLoading } = useLegalDocumentsList(isEditMode ? organizationId : null)
    const documents = data?.documents ?? []

    useEffect(() => {
        if (!isEditMode || documents.length === 0) return
        const allIds = documents.map((doc) => doc.id)
        setQuoteData((prev) =>
            prev.legalDocumentIds.length === 0 ? { ...prev, legalDocumentIds: allIds } : prev
        )
    }, [isEditMode, documents, setQuoteData])

    const onSelectedIdsChange = useCallback(
        (ids: string[]) => {
            setQuoteData((prev) => ({ ...prev, legalDocumentIds: ids }))
        },
        [setQuoteData]
    )

    return { documents, isLoading, onSelectedIdsChange }
}
