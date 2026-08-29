import { HttpResponse, http } from "msw"
import {
    TEST_ORG_ID,
    TEST_ORG_NAME,
    TEST_ORG_SLUG,
    TEST_USER_EMAIL,
    TEST_USER_ID,
    TEST_USER_NAME,
} from "@/shared/test/fixtures/identity"

export const authHandlers = [
    // Mirrors getProfileFromToken in src/features/auth/api/auth.ts — the only
    // /api/* auth endpoint the frontend actually hits. The external auth
    // service (`${AUTH_URL}/auth/me`) is not mocked here because MSW Node
    // mode intercepts by absolute URL and the AUTH_URL is environment-bound;
    // tests that need it should `server.use(http.get(absoluteUrl, ...))`.
    http.get("/api/auth/profile", () =>
        HttpResponse.json({
            id: TEST_USER_ID,
            name: TEST_USER_NAME,
            email: TEST_USER_EMAIL,
            emailVerified: true,
            image: null,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
            twoFactorEnabled: false,
            stripeCustomerId: null,
            // Least-privilege default. Specs that need admin/owner access
            // must override with `server.use(http.get("/api/auth/profile", ...))`.
            role: "member",
            dominantColor: null,
        })
    ),
    // Mirrors fetchActiveOrganization in src/features/auth/api/active-organization.server.ts
    http.get("/api/onboarding/status", () =>
        HttpResponse.json({
            organization: {
                id: TEST_ORG_ID,
                name: TEST_ORG_NAME,
                slug: TEST_ORG_SLUG,
                logo: null,
                tagline: null,
                brandColor: "#0103B8",
            },
        })
    ),
]
