import { HttpResponse, http } from "msw"

export const invoicesHandlers = [
    http.get("/api/subscription/invoices", () =>
        HttpResponse.json({
            invoices: [],
            hasMore: false,
        })
    ),
]
