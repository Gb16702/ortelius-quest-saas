interface UmamiTracker {
    track: {
        (): void
        (payload: UmamiPayload | UmamiPayloadFactory): void
        (event: string, data?: AnalyticsData): void
    }
}

declare global {
    interface Window {
        umami?: UmamiTracker
    }
}

type AnalyticsData = Record<string, string | number | boolean>
type UmamiPayload = Record<string, unknown>
type UmamiPayloadFactory = (props: UmamiPayload) => UmamiPayload

const TRACKER_RETRY_DELAY_MS = 250
const TRACKER_MAX_ATTEMPTS = 20

function withTracker(callback: (tracker: UmamiTracker) => void, attempt = 0): void {
    if (typeof window === "undefined") {
        return
    }

    if (window.umami) {
        callback(window.umami)
        return
    }

    if (attempt >= TRACKER_MAX_ATTEMPTS) {
        return
    }

    window.setTimeout(() => {
        withTracker(callback, attempt + 1)
    }, TRACKER_RETRY_DELAY_MS)
}

export function trackPageView(url: string): void {
    withTracker((tracker) => {
        tracker.track((props) => ({ ...props, url }))
    })
}
