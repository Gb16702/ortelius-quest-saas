import { afterAll, afterEach, describe, expect, it, mock } from "bun:test"
import type { SessionResponse } from "@/entities/session"
import type { RequestScopeKey } from "../../api/requests.api"
import type { RequestData, RequestLifecycleStatus } from "../../model/request"
import type { ShareRequestSource } from "../share-request-dialog"

const publicEnvDefaults = {
    NODE_ENV: "development",
    VITE_API_URL: "https://api.example.test",
    VITE_PORTAL_ACCOUNT_URL: "https://portal.example.test",
    VITE_WS_URL: "wss://ws.example.test",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(publicEnvDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(publicEnvDefaults)) {
    process.env[key] = value
}

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

const [
    { cleanup, screen, within },
    { HttpResponse, http },
    { server },
    { renderWithProviders },
    { setupMswServer },
    { TEST_ORG_ID, TEST_USER_ID },
    { createRequestDetail },
    { RequestModal },
    { defaultLanguage, ensureAppLanguageResources },
] = await Promise.all([
    import("@testing-library/react"),
    import("msw"),
    import("@/shared/test/msw/msw-server"),
    import("@/shared/test/render/render-with-providers"),
    import("@/shared/test/setup/msw-server-lifecycle"),
    import("@/shared/test/fixtures/identity"),
    import("../../model/test/request-detail.factory"),
    import("../request-modal"),
    import("@/shared/lib/i18n/marketing"),
])

await ensureAppLanguageResources(defaultLanguage)

const ORG_REQUEST_SCOPE: RequestScopeKey = {
    scope: "organization",
    scopeId: TEST_ORG_ID,
}

const SESSION: SessionResponse = {
    user: {
        id: TEST_USER_ID,
        name: "Ada Lovelace",
        email: "ada@example.test",
        emailVerified: true,
        image: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        twoFactorEnabled: false,
        stripeCustomerId: null,
        role: "member",
        dominantColor: null,
    },
    session: { activeOrganizationId: TEST_ORG_ID },
    accessToken: null,
}

interface RenderRequestModalOptions {
    isOpen?: boolean
    requestData?: RequestData | null
    requestNumber?: string
    currentUserRole?: string | null
    requestScope?: RequestScopeKey
    onClose?: () => void
    isEditMode?: boolean
    onShareRequest?: (request: ShareRequestSource) => void
}

function renderRequestModal({
    isOpen = true,
    requestData = createRequestDetail(),
    requestNumber = "REQ-0001",
    currentUserRole = "admin",
    requestScope = ORG_REQUEST_SCOPE,
    onClose = mock(() => {}),
    isEditMode = false,
    onShareRequest,
}: RenderRequestModalOptions = {}) {
    const handleEditModeChange = mock((_value: boolean) => {})
    const handleCancelConfirm = mock(() => {})
    const handleRejectConfirm = mock(() => {})
    const handleValidateConfirm = mock(() => {})
    const handleDiscardConfirm = mock(() => {})
    const handleRefetch = mock(() => {})

    const result = renderWithProviders(
        <RequestModal
            isOpen={isOpen}
            requestNumber={requestNumber}
            isEditMode={isEditMode}
            isCancelLoading={false}
            requestData={requestData}
            isRequestLoading={false}
            requestError={null}
            onRequestRefetch={handleRefetch}
            sessionData={SESSION}
            requestScope={requestScope}
            currentUserRole={currentUserRole}
            onClose={onClose}
            onEditModeChange={handleEditModeChange}
            onCancelConfirm={handleCancelConfirm}
            onRejectConfirm={handleRejectConfirm}
            onValidateConfirm={handleValidateConfirm}
            onDiscardConfirm={handleDiscardConfirm}
            onShareRequest={onShareRequest}
        />
    )

    return {
        ...result,
        handleEditModeChange,
        handleCancelConfirm,
        handleRejectConfirm,
        onClose,
    }
}

function getModalToolbarButtons(): HTMLElement[] {
    // The modal renders both the actions dropdown trigger and the close button
    // inside a single ButtonGroup at the top-right of the sheet. Neither button
    // has an accessible name in the current source (the labels live in tooltip
    // content, which only mounts on hover), so we anchor on the group role.
    const groups = screen.getAllByRole("group")
    const toolbar = groups[0]
    if (!toolbar) throw new Error("Expected to find the modal toolbar group")
    return within(toolbar).getAllByRole("button")
}

function getActionsMenuTrigger(): HTMLElement {
    const [trigger] = getModalToolbarButtons()
    if (!trigger) throw new Error("Expected to find the actions menu trigger")
    return trigger
}

function getModalCloseButton(): HTMLElement {
    const buttons = getModalToolbarButtons()
    const closeButton = buttons[buttons.length - 1]
    if (!closeButton) throw new Error("Expected to find the modal close button")
    return closeButton
}

function emptyLegalDocumentsHandler() {
    return http.get(`/api/organizations/${TEST_ORG_ID}/legal-documents`, () =>
        HttpResponse.json({
            documents: [],
            totalSizeBytes: 0,
            quotaBytes: 100,
        })
    )
}

function emptyFavoritesHandler() {
    return http.get("/api/favorites", () =>
        HttpResponse.json({
            success: true,
            data: {
                favorites: [],
                groups: [],
            },
        })
    )
}

const OPEN_STATUS: RequestLifecycleStatus = "open"

describe("RequestModal", () => {
    setupMswServer(emptyLegalDocumentsHandler(), emptyFavoritesHandler())

    afterEach(() => {
        cleanup()
    })

    it("renders the request number from the provided request data when open", () => {
        renderRequestModal({
            requestData: createRequestDetail({ reqNumber: "REQ-1234" }),
            requestNumber: "REQ-1234",
        })

        expect(screen.getByRole("heading", { name: /REQ-1234/i })).toBeInTheDocument()
        expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument()
    })

    it("does not render the sheet content when closed", () => {
        renderRequestModal({ isOpen: false })

        expect(screen.queryByRole("heading", { name: /REQ-0001/i })).not.toBeInTheDocument()
    })

    it("invokes onClose when the close icon button is activated", async () => {
        const onClose = mock(() => {})
        const { user } = renderRequestModal({ onClose })

        await user.click(getModalCloseButton())

        expect(onClose).toHaveBeenCalled()
    })

    it("reflects updated request data after the prop changes on rerender", () => {
        const { rerender } = renderRequestModal({
            requestData: createRequestDetail({
                reqNumber: "REQ-INITIAL",
                requester: {
                    id: TEST_USER_ID,
                    name: "Original Requester",
                    email: "original@example.test",
                    image: null,
                },
            }),
            requestNumber: "REQ-INITIAL",
        })

        expect(screen.getByRole("heading", { name: /REQ-INITIAL/i })).toBeInTheDocument()
        expect(screen.getByText("Original Requester")).toBeInTheDocument()

        rerender(
            <RequestModal
                isOpen={true}
                requestNumber="REQ-UPDATED"
                isEditMode={false}
                isCancelLoading={false}
                requestData={createRequestDetail({
                    reqNumber: "REQ-UPDATED",
                    requester: {
                        id: TEST_USER_ID,
                        name: "Fresh Requester",
                        email: "fresh@example.test",
                        image: null,
                    },
                })}
                isRequestLoading={false}
                requestError={null}
                onRequestRefetch={() => {}}
                sessionData={SESSION}
                requestScope={ORG_REQUEST_SCOPE}
                currentUserRole="admin"
                onClose={() => {}}
                onEditModeChange={() => {}}
                onCancelConfirm={() => {}}
                onRejectConfirm={() => {}}
                onValidateConfirm={() => {}}
                onDiscardConfirm={() => {}}
            />
        )

        expect(screen.getByRole("heading", { name: /REQ-UPDATED/i })).toBeInTheDocument()
        expect(screen.getByText("Fresh Requester")).toBeInTheDocument()
        expect(screen.queryByText("Original Requester")).not.toBeInTheDocument()
    })

    describe("permission-gated footer actions", () => {
        it("shows organization manager footer actions (reject + answer with quote) for admin", () => {
            renderRequestModal({
                currentUserRole: "admin",
                requestData: createRequestDetail({ lifecycleStatus: OPEN_STATUS }),
            })

            expect(screen.getByRole("button", { name: /Answer with quote/i })).toBeInTheDocument()
            expect(screen.getByRole("button", { name: /Reject request/i })).toBeInTheDocument()
        })

        it("shows organization manager footer actions (reject + answer with quote) for member", () => {
            renderRequestModal({
                currentUserRole: "member",
                requestData: createRequestDetail({ lifecycleStatus: OPEN_STATUS }),
            })

            expect(screen.getByRole("button", { name: /Answer with quote/i })).toBeInTheDocument()
            expect(screen.getByRole("button", { name: /Reject request/i })).toBeInTheDocument()
        })

        it("hides manage actions when the current user has no recognized role", () => {
            renderRequestModal({
                currentUserRole: null,
                requestData: createRequestDetail({ lifecycleStatus: OPEN_STATUS }),
            })

            expect(
                screen.queryByRole("button", { name: /Answer with quote/i })
            ).not.toBeInTheDocument()
            expect(
                screen.queryByRole("button", { name: /Reject request/i })
            ).not.toBeInTheDocument()
        })

        it("uses the cancel footer for personal scope (no organization manager actions)", () => {
            const PERSONAL_SCOPE: RequestScopeKey = {
                scope: "personal",
                scopeId: TEST_USER_ID,
            }

            renderRequestModal({
                currentUserRole: "admin",
                requestScope: PERSONAL_SCOPE,
                requestData: createRequestDetail({ lifecycleStatus: OPEN_STATUS }),
            })

            expect(screen.getByRole("button", { name: /Cancel request/i })).toBeInTheDocument()
            expect(
                screen.queryByRole("button", { name: /Answer with quote/i })
            ).not.toBeInTheDocument()
        })

        it("exposes the assign action in the dropdown only when the policy allows assignment (admin)", async () => {
            const { user } = renderRequestModal({
                currentUserRole: "admin",
                requestData: createRequestDetail({
                    lifecycleStatus: "open",
                    closedReason: null,
                    assignedTo: null,
                }),
            })

            await user.click(getActionsMenuTrigger())

            expect(
                await screen.findByRole("menuitem", { name: /Assign request/i })
            ).toBeInTheDocument()
        })

        it("exposes the request favorite action in the dropdown for organization requests", async () => {
            const { user } = renderRequestModal({
                requestData: createRequestDetail({
                    id: "request-favorite-1",
                    reqNumber: "REQ-FAVORITE-1",
                    lifecycleStatus: "open",
                    closedReason: null,
                }),
            })

            await user.click(getActionsMenuTrigger())

            expect(
                await screen.findByRole("menuitem", { name: /Add favorite/i })
            ).toBeInTheDocument()
        })

        it("opens the share flow from the dropdown for organization requests", async () => {
            const onShareRequest = mock((_request: ShareRequestSource) => {})
            const { user } = renderRequestModal({
                onShareRequest,
                requestData: createRequestDetail({
                    id: "request-share-1",
                    reqNumber: "REQ-SHARE-1",
                    lifecycleStatus: "open",
                    closedReason: null,
                }),
                requestNumber: "REQ-SHARE-1",
            })

            await user.click(getActionsMenuTrigger())
            await user.click(await screen.findByRole("menuitem", { name: /Share/i }))

            expect(onShareRequest).toHaveBeenCalledWith({
                id: "request-share-1",
                reqNumber: "REQ-SHARE-1",
            })
        })

        it("exposes the assign action in the dropdown for member as well", async () => {
            const { user } = renderRequestModal({
                currentUserRole: "member",
                requestData: createRequestDetail({
                    lifecycleStatus: "open",
                    closedReason: null,
                    assignedTo: null,
                }),
            })

            await user.click(getActionsMenuTrigger())

            expect(
                await screen.findByRole("menuitem", { name: /Assign request/i })
            ).toBeInTheDocument()
        })

        it("does not expose the assign action when the user has no recognized role", async () => {
            const { user } = renderRequestModal({
                currentUserRole: null,
                requestData: createRequestDetail({
                    lifecycleStatus: "open",
                    closedReason: null,
                    assignedTo: null,
                }),
            })

            await user.click(getActionsMenuTrigger())

            expect(
                await screen.findByRole("menuitem", { name: /Download PDF/i })
            ).toBeInTheDocument()
            expect(
                screen.queryByRole("menuitem", { name: /Assign request/i })
            ).not.toBeInTheDocument()
        })

        it("hides the assign action when the request is in a terminal status, even for admin", async () => {
            const { user } = renderRequestModal({
                currentUserRole: "admin",
                requestData: createRequestDetail({
                    lifecycleStatus: "closed",
                    closedReason: "cancelled",
                }),
            })

            await user.click(getActionsMenuTrigger())

            expect(
                await screen.findByRole("menuitem", { name: /Download PDF/i })
            ).toBeInTheDocument()
            expect(
                screen.queryByRole("menuitem", { name: /Assign request/i })
            ).not.toBeInTheDocument()
        })
    })

    it("opens with no unhandled requests when the modal mounts against a fresh org scope", async () => {
        // MSW is set to error on unmocked requests. This test asserts that the
        // setup handler stays in sync with the production fetch path that the
        // open modal triggers: /api/organizations/:id/legal-documents.
        server.use(emptyLegalDocumentsHandler())

        renderRequestModal({ requestData: createRequestDetail() })

        await screen.findByRole("heading", { name: /REQ-0001/i })
    })
})
