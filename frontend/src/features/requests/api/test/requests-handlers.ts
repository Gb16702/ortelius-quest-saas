import { HttpResponse, http } from "msw"
import { createRequest } from "../../model/test/request.factory"
import { createRequestDetail } from "../../model/test/request-detail.factory"

export const requestsHandlers = [
    http.get("/api/requests", () => {
        const request = createRequest()
        return HttpResponse.json({
            data: {
                requests: [request],
                pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
            },
        })
    }),
    http.get("/api/requests/:id", ({ params }) => {
        const detail = createRequestDetail({ id: String(params.id) })
        return HttpResponse.json({ data: detail })
    }),
    http.get("/api/requests/by-number/:number", ({ params }) => {
        const detail = createRequestDetail({ reqNumber: String(params.number) })
        return HttpResponse.json({ data: detail })
    }),
]
