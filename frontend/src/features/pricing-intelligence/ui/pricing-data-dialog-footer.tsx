import { useCallback, useRef } from "react"

import { Button } from "@/shared/ui/button"
import { DialogCancel, DialogFooter } from "@/shared/ui/dialog"

import { usePricingIntelligence } from "../model/pricing-intelligence.provider"

interface PricingDataDialogFooterProps {
    onClose: () => void
}

export function PricingDataDialogFooter({ onClose }: PricingDataDialogFooterProps) {
    const { state, actions } = usePricingIntelligence()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) {
                actions.importCsv(file)
                e.target.value = ""
            }
        },
        [actions]
    )

    const downloadTemplate = useCallback(async () => {
        const res = await fetch(`/api/pricing-intelligence/template`, { credentials: "include" })
        if (!res.ok) return
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "pricing-template.csv"
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    return (
        <DialogFooter>
            <DialogCancel size="lg" type="button" onClick={onClose}>
                Close
            </DialogCancel>

            <div className="flex items-center gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <Button size="lg" radius="full" variant="outline" onClick={downloadTemplate}>
                    Download Template
                </Button>

                <Button
                    size="lg"
                    radius="full"
                    variant="solid"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={state.isImporting}
                >
                    {state.isImporting ? "Importing..." : "Import CSV"}
                </Button>
            </div>
        </DialogFooter>
    )
}
