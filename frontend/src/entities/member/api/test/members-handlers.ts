import { HttpResponse, http } from "msw"
import { createMember } from "../../model/test/member.factory"

export const membersHandlers = [
    // Mirrors the list query in src/entities/member/api/member.query.ts.
    http.get("/api/organizations/:organizationId/members", () => {
        const member = createMember()
        return HttpResponse.json({
            data: {
                members: [member],
                total: 1,
            },
        })
    }),
    // Mirrors useMemberProfile in src/entities/member/api/member.query.ts —
    // production fetches `/api/members/${userId}/profile`, not
    // `/api/organizations/:slug/members/:memberId`.
    http.get("/api/members/:userId/profile", ({ params }) => {
        const member = createMember({ id: String(params.userId) })
        return HttpResponse.json({
            data: {
                user: {
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email,
                    image: member.user.image,
                    dominantColor: null,
                    createdAt: member.createdAt,
                },
                membership: {
                    id: member.id,
                    organizationId: String(params.organizationId ?? "org-1"),
                    role: member.role,
                    joinedAt: member.createdAt,
                },
                assignedRequests: [],
            },
        })
    }),
]
