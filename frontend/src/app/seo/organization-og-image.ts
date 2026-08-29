interface OrgImageHashInput {
    name: string
    brandColor: string | null
}

export function buildOrgImageHash({ name, brandColor }: OrgImageHashInput): string {
    const source = `${name}|${brandColor ?? ""}`
    let h = 2166136261
    for (let i = 0; i < source.length; i++) {
        h ^= source.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(36)
}

interface OrgImageUrlInput {
    apiBaseUrl: string
    slug: string
    hash: string
}

export function buildOrgImageUrl({ apiBaseUrl, slug, hash }: OrgImageUrlInput): string {
    const url = new URL(`/og/org/${slug}.png`, apiBaseUrl)
    url.searchParams.set("v", hash)
    return url.toString()
}
