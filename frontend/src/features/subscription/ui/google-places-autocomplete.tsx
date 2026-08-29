import { useEffect, useRef, useState } from "react"
import { Combobox, type ComboboxOption } from "@/shared/ui/combobox"
// TODO_i18n_review: GooglePlacesAutocomplete loading/error copy stays English;
// translations exist under settings.json billingAddress.places.* — deferred to a
// focused pass once the autocomplete surface is reviewed end-to-end.
import type { FieldControlSize } from "@/shared/ui/field-control-shape"
import { loadGooglePlacesLibrary } from "../lib/google-places-library"
import { parsePlace } from "../lib/parse-place"
import type { BillingAddressFormData } from "../model/schemas/billing-address.schema"

const ADDRESS_PRIMARY_TYPES = ["street_address", "premise", "subpremise", "route", "postal_code"]
const AUTOCOMPLETE_DEBOUNCE_MS = 300

interface GooglePlacesAutocompleteProps {
    countryCode?: string
    placeholder?: string
    onSelect: (address: Partial<BillingAddressFormData>) => void
    onManualEntry?: () => void
    className?: string
    size?: FieldControlSize
}

export function GooglePlacesAutocomplete({
    countryCode,
    placeholder = "Start typing your address...",
    onSelect,
    onManualEntry,
    className,
    size = "default",
}: GooglePlacesAutocompleteProps) {
    const [placesLibrary, setPlacesLibrary] = useState<google.maps.PlacesLibrary | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [autocompleteError, setAutocompleteError] = useState<string | null>(null)
    const [isPending, setIsPending] = useState(false)
    const [value, setValue] = useState("")
    const [predictions, setPredictions] = useState<google.maps.places.PlacePrediction[]>([])
    const latestRequestRef = useRef(0)
    const lastCountryCodeRef = useRef(countryCode)
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

    useEffect(() => {
        loadGooglePlacesLibrary()
            .then(setPlacesLibrary)
            .catch((err: unknown) => setLoadError(getErrorMessage(err)))
    }, [])

    useEffect(() => {
        if (countryCode === lastCountryCodeRef.current) return
        lastCountryCodeRef.current = countryCode
        setAutocompleteError(null)
        sessionTokenRef.current = null
    }, [countryCode])

    useEffect(() => {
        const input = value.trim()
        if (!(placesLibrary && input) || autocompleteError) {
            setPredictions([])
            setIsPending(false)
            return
        }

        setIsPending(true)
        const requestId = latestRequestRef.current + 1
        latestRequestRef.current = requestId

        const timeoutId = window.setTimeout(async () => {
            try {
                const sessionToken =
                    sessionTokenRef.current ?? new placesLibrary.AutocompleteSessionToken()
                sessionTokenRef.current = sessionToken

                const request: google.maps.places.AutocompleteRequest = {
                    input,
                    includedPrimaryTypes: ADDRESS_PRIMARY_TYPES,
                    sessionToken,
                    ...(countryCode
                        ? {
                              includedRegionCodes: [countryCode.toLowerCase()],
                              region: countryCode.toLowerCase(),
                          }
                        : {}),
                }
                const { suggestions } =
                    await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

                if (latestRequestRef.current !== requestId) return
                setPredictions(
                    suggestions
                        .map((suggestion) => suggestion.placePrediction)
                        .filter(isPlacePrediction)
                        .slice(0, 10)
                )
            } catch (err) {
                if (latestRequestRef.current !== requestId) return
                console.error("Failed to fetch place suggestions:", err)
                setAutocompleteError(getAutocompleteErrorMessage(err))
                setPredictions([])
            } finally {
                if (latestRequestRef.current === requestId) {
                    setIsPending(false)
                }
            }
        }, AUTOCOMPLETE_DEBOUNCE_MS)

        return () => window.clearTimeout(timeoutId)
    }, [autocompleteError, countryCode, placesLibrary, value])

    const handleValueChange = (nextValue: string) => {
        setValue(nextValue)
        if (!nextValue.trim()) {
            setAutocompleteError(null)
            sessionTokenRef.current = null
            setPredictions([])
            setIsPending(false)
        }
    }

    const handleSelect = async (prediction: google.maps.places.PlacePrediction) => {
        setValue(prediction.text.text)
        setPredictions([])

        try {
            const place = prediction.toPlace()
            const { place: fetchedPlace } = await place.fetchFields({
                fields: ["addressComponents", "displayName", "formattedAddress"],
            })
            onSelect(parsePlace(fetchedPlace))
            sessionTokenRef.current = null
        } catch (err) {
            console.error("Failed to fetch place details:", err)
        }
    }

    const options: ComboboxOption[] = predictions.map((prediction) => ({
        value: prediction.placeId,
        label: prediction.text.text,
        onSelect: () => handleSelect(prediction),
    }))

    const footer: ComboboxOption | undefined = onManualEntry
        ? {
              value: "__manual__",
              label: "Enter address manually",
              onSelect: () => {
                  setPredictions([])
                  sessionTokenRef.current = null
                  onManualEntry()
              },
          }
        : undefined

    return (
        <>
            <Combobox
                value={value}
                onValueChange={handleValueChange}
                options={options}
                footer={footer}
                loading={isPending}
                disabled={!placesLibrary || Boolean(loadError)}
                size={size}
                placeholder={
                    loadError
                        ? "Autocomplete unavailable"
                        : !placesLibrary
                          ? "Loading autocomplete..."
                          : placeholder
                }
                className={className}
            />
            {loadError && <p className="mt-1 text-ds-danger-text text-xs">{loadError}</p>}
            {autocompleteError && (
                <p className="mt-1 text-ds-danger-text text-xs">{autocompleteError}</p>
            )}
        </>
    )
}

function isPlacePrediction(
    prediction: google.maps.places.PlacePrediction | null
): prediction is google.maps.places.PlacePrediction {
    return prediction !== null
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Google Maps failed to load."
}

function getAutocompleteErrorMessage(error: unknown): string {
    const message = getErrorMessage(error)
    if (message.includes("Places API (New)") || message.includes("403")) {
        return "Google Places API (New) is not enabled for this API key. Enter the address manually."
    }

    return "Address autocomplete is temporarily unavailable. Enter the address manually."
}
