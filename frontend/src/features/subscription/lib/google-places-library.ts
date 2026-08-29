import { importLibrary, setOptions } from "@googlemaps/js-api-loader"
import { publicEnv } from "@/shared/config/env"

let loadPromise: Promise<google.maps.PlacesLibrary> | null = null

export function loadGooglePlacesLibrary(): Promise<google.maps.PlacesLibrary> {
    if (loadPromise) return loadPromise

    const apiKey = publicEnv.GMAPS_KEY
    if (!apiKey) {
        return Promise.reject(new Error("VITE_GMAPS_KEY is missing in the environment."))
    }

    setOptions({ key: apiKey, v: "weekly" })
    loadPromise = importLibrary("places")
    return loadPromise
}
