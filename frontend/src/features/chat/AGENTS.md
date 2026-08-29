# Chat Feature

This feature owns conversations, message state, message composition, attachments, pinned messages, read status, typing, search, and WebSocket message handling.

`model/chat-page.provider.tsx` and `model/chats-page.provider.tsx` are already large. Prefer extracting focused hooks, reducers, or module-level helpers before adding more provider state.

Message compound components live under `ui/message`. Keep message frame, content, header, toolbar, attachments, and edit state inside that compound component boundary.

WebSocket transport belongs in `src/shared/api/websocket`. Chat should consume it through existing hooks/context and should not create a second transport layer.

Do not introduce polling when WebSocket events already cover the behavior.

Preserve optimistic UI, rollback/error handling, read-status, and typing behavior when changing message flows.

When touching attachments, verify preview, fullscreen view, upload, and removal paths. Long filenames and unsupported file types should remain handled.
