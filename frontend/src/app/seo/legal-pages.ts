export const legalPages = {
    privacy: {
        pathname: "/privacy",
        title: "Privacy Policy — Ortelius Quest",
        description:
            "How Ortelius Quest collects, uses, and protects your personal data, in line with GDPR, CCPA, and LGPD.",
    },
    terms: {
        pathname: "/terms",
        title: "Terms of Service — Ortelius Quest",
        description:
            "The terms that govern your use of Ortelius Quest, including account, billing, and acceptable use.",
    },
    cookies: {
        pathname: "/cookies",
        title: "Cookie Policy — Ortelius Quest",
        description:
            "How and why Ortelius Quest uses cookies and similar technologies, and how to manage your preferences.",
    },
} as const

export type LegalPageKey = keyof typeof legalPages

export function getLegalPagePrerenderPaths(page: LegalPageKey): string[] {
    return [legalPages[page].pathname]
}
