import { useState } from "react"
import { useAcceptQuote } from "./use-accept-quote"
import type { Quote } from "./use-quote"
import { useRejectQuote } from "./use-reject-quote"

export function useQuoteDialogs(onQuoteAction?: () => void) {
    const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false)
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

    const acceptMutation = useAcceptQuote()
    const rejectMutation = useRejectQuote()

    const openAcceptDialog = (quote: Quote) => {
        if (quote.status !== "sent") return
        setSelectedQuote(quote)
        setIsAcceptDialogOpen(true)
    }

    const openRejectDialog = (quote: Quote) => {
        if (quote.status !== "sent") return
        setSelectedQuote(quote)
        setIsRejectDialogOpen(true)
    }

    const closeDialogs = () => {
        setIsAcceptDialogOpen(false)
        setIsRejectDialogOpen(false)
        setSelectedQuote(null)
    }

    const confirmAcceptance = () => {
        if (!selectedQuote) return

        acceptMutation.mutate(
            { quoteId: selectedQuote.id },
            {
                onSuccess: () => {
                    closeDialogs()
                    onQuoteAction?.()
                },
            }
        )
    }

    const confirmRejection = (reason: string) => {
        if (!selectedQuote) return

        rejectMutation.mutate(
            { quoteId: selectedQuote.id, reason },
            {
                onSuccess: () => {
                    closeDialogs()
                    onQuoteAction?.()
                },
            }
        )
    }

    return {
        selectedQuote,
        isAcceptDialogOpen,
        isRejectDialogOpen,
        isActionPending: acceptMutation.isPending || rejectMutation.isPending,
        isAccepting: acceptMutation.isPending,
        isRejecting: rejectMutation.isPending,
        openAcceptDialog,
        openRejectDialog,
        closeDialogs,
        confirmAcceptance,
        confirmRejection,
    }
}
