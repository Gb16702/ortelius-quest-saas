import { HttpResponse, http } from "msw"
import { createConversation } from "../../model/test/conversation.factory"
import { createMessage } from "../../model/test/message.factory"

export const chatHandlers = [
    http.get("/api/conversations", () => {
        const conversation = createConversation()
        return HttpResponse.json({
            data: {
                conversations: [conversation],
            },
        })
    }),
    http.get("/api/conversations/:id/messages", () => {
        const message = createMessage()
        return HttpResponse.json({
            data: {
                messages: [message],
                pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
            },
        })
    }),
    http.post("/api/messages/:id", ({ params }) => {
        const message = createMessage({ id: `${String(params.id)}-message-1` })
        return HttpResponse.json({ success: true, data: message })
    }),
]
