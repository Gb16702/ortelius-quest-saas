interface ApiProxyTarget {
    path: string
    url: URL
}

const ABSOLUTE_PATH_SEGMENT_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/
const MAX_DECODE_DEPTH = 5

function splitEndpoint(endpoint: string): { path: string; search: string } | null {
    if (endpoint.includes("#")) return null

    const queryStart = endpoint.indexOf("?")
    if (queryStart === -1) {
        return { path: endpoint, search: "" }
    }

    return {
        path: endpoint.slice(0, queryStart),
        search: endpoint.slice(queryStart),
    }
}

function decodePathSegment(segment: string): string | null {
    let currentSegment = segment

    for (let depth = 0; depth < MAX_DECODE_DEPTH; depth += 1) {
        let decodedSegment: string
        try {
            decodedSegment = decodeURIComponent(currentSegment)
        } catch {
            return null
        }

        if (decodedSegment === currentSegment) {
            return decodedSegment
        }

        currentSegment = decodedSegment
    }

    return null
}

function canonicalizeEndpointPath(path: string): string | null {
    if (path.startsWith("/") || path.startsWith("\\")) return null

    const canonicalSegments: string[] = []
    const segments = path.split("/")

    for (const [index, segment] of segments.entries()) {
        const decodedSegment = decodePathSegment(segment)
        if (decodedSegment === null) return null
        if (decodedSegment === "." || decodedSegment === "..") return null
        if (decodedSegment.includes("/") || decodedSegment.includes("\\")) return null
        if (index === 0 && ABSOLUTE_PATH_SEGMENT_PATTERN.test(decodedSegment)) return null

        canonicalSegments.push(encodeURIComponent(decodedSegment))
    }

    return canonicalSegments.join("/")
}

export function buildApiProxyTarget(endpoint: string, apiBaseUrl: string): ApiProxyTarget | null {
    const parts = splitEndpoint(endpoint)
    if (!parts) return null

    const path = canonicalizeEndpointPath(parts.path)
    if (path === null) return null

    const apiRoot = new URL(`${apiBaseUrl.replace(/\/+$/, "")}/api/`)
    const url = new URL(`${path}${parts.search}`, apiRoot)

    if (!url.pathname.startsWith(apiRoot.pathname)) {
        return null
    }

    return { path, url }
}
