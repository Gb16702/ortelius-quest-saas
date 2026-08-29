import type { Page, Route } from "@playwright/test"
import { E2E_AUTH_ACCOUNTS } from "./fixtures/api.fixture"
import { expect, test } from "./fixtures/auth.fixture"
import { E2E_ORG_ID, E2E_ORG_SLUG, uniqueE2EValue } from "./helpers/e2e-app"

const E2E_LEGAL_DOCUMENT_ID = "11111111-1111-4111-8111-111111111111"

interface CreatedRequest {
    id: string
    reqNumber: string
}

interface QuoteSubmissionPayload {
    requestId: string
    selectedCategories: string[]
    selectedServices: Array<{ serviceId: string; included: boolean; price: number }>
    cargoDetails: {
        weight: number | null
        volume: number | null
        palletCount: number | null
        fragility: "fragile" | "robust" | null
        dimensions: { length: number | null; width: number | null; height: number | null }
        options: {
            hazardous: boolean
            insuranceCoverage: boolean
            perishableGoods: boolean
        }
    }
    vatRate: number
    totalHT: number
    totalTTC: number
    vatAmount: number
    description?: string
    legalDocumentIds: string[]
}

test.describe("requests create quote assign flow @critical", () => {
    test("creates a request, submits a quote, assigns it to a member, and prevents double acceptance", async ({
        page,
        adminPage,
        memberPage,
    }) => {
        const requesterFirstName = "E2E"
        const requesterLastName = uniqueE2EValue("Requester")
        const requestNote = uniqueE2EValue("request-note")
        const createdRequest = { current: null as CreatedRequest | null }
        const quotePayload = { current: null as QuoteSubmissionPayload | null }

        await injectRequesterIdIntoSendRequest(page, (request) => {
            createdRequest.current = request
        })

        await page.goto(`/org/${E2E_ORG_SLUG}?send-request=true`)
        await expect(page.getByRole("heading", { name: "Send a request" })).toBeVisible()

        await page.getByLabel("First name").fill(requesterFirstName)
        await page.getByLabel("Last name").fill(requesterLastName)
        await page.getByLabel("Email").fill(E2E_AUTH_ACCOUNTS.member.email)
        await page.getByLabel("Date range").click()
        const enabledDays = page.locator("button[data-day]:not(:disabled)")
        await enabledDays.nth(1).click()
        await enabledDays.nth(4).click()
        await page.getByRole("button", { name: "Continue" }).click()

        await page.getByPlaceholder("Search categories...").fill("E2E Cargo")
        await page.getByRole("checkbox", { name: "E2E Cargo" }).check()
        await page.getByRole("button", { name: "Continue" }).click()

        await page.getByPlaceholder("Search services...").fill("E2E Freight Forwarding")
        await page.getByRole("checkbox", { name: "E2E Freight Forwarding" }).check()
        await page.getByRole("button", { name: "Continue" }).click()

        await page.getByLabel("Length (m)").fill("12")
        await page.getByLabel("Width (m)").fill("2")
        await page.getByLabel("Height (m)").fill("3")
        await page.getByLabel("Volume (m³)").fill("72")
        await page.getByLabel("Weight (ton)").fill("10")
        await page.getByLabel("Pallet count").fill("4")
        await page.getByText("Select fragility level").click()
        await page.getByRole("option", { name: "Robust" }).click()
        await page.getByLabel("Insurance coverage").click()
        await page.getByLabel("Additional comments").fill(requestNote)
        await page.getByRole("button", { name: "Submit" }).click()

        await expect(page.getByRole("dialog", { name: "Request submitted successfully" })).toBeVisible()
        await expect.poll(() => createdRequest.current?.reqNumber ?? null).not.toBeNull()

        if (!createdRequest.current) throw new Error("Expected send-request form to create a request")
        const requestSearchTerm = getDisplayedRequestNumber(createdRequest.current.reqNumber)

        await mockLegalDocuments(adminPage)
        await mockQuoteSubmission(adminPage, (payload) => {
            quotePayload.current = payload
        })

        await openRequestFromOrganizationList(adminPage, requestSearchTerm)
        await adminPage.getByRole("button", { name: "Answer with quote" }).click()
        await expect(adminPage.getByText("All 1 document attached")).toBeVisible()
        await adminPage.getByLabel("Price for E2E Freight Forwarding").fill("1200")
        await adminPage.getByRole("button", { name: "Submit quote" }).click()
        await expect.poll(() => quotePayload.current?.requestId ?? null).toBe(createdRequest.current.id)

        await openAssignRequestDialog(adminPage, requestSearchTerm)
        const assignDialog = adminPage.getByRole("dialog", { name: "Assign Request" })
        await expect(assignDialog).toBeVisible()
        await assignDialog.getByPlaceholder("Search user").fill(E2E_AUTH_ACCOUNTS.member.email)
        await assignDialog.getByText("E2E Member", { exact: true }).click()
        await assignDialog.getByRole("button", { name: "Assign" }).click()
        await expect(adminPage.getByText("Request assigned to E2E Member")).toBeVisible()

        await memberPage.goto(`/org/${E2E_ORG_SLUG}/requests?search=${encodeURIComponent(requestSearchTerm)}`)
        await expect(memberPage.getByRole("row", { name: new RegExp(requestSearchTerm) })).toBeVisible()

        if (!quotePayload.current) throw new Error("Expected quote payload to be captured")

        await mockAcceptedQuoteFlow(memberPage, createdRequest.current, quotePayload.current)
        await memberPage.goto(`/me/requests?search=${encodeURIComponent(requestSearchTerm)}`)
        await openRequestFromCurrentList(memberPage, requestSearchTerm)
        await memberPage.getByRole("button", { name: "Accept Quote" }).click()
        await expect(memberPage.getByRole("dialog", { name: "Accept Quote" })).toBeVisible()
        await memberPage
            .getByLabel("I have reviewed and accept the terms and conditions of this quote.")
            .click()
        await memberPage.getByRole("button", { name: "Accept Quote" }).click()

        await memberPage.goto(`/me/requests?search=${encodeURIComponent(requestSearchTerm)}`)
        await openRequestFromCurrentList(memberPage, requestSearchTerm)
        await expect(memberPage.getByText("Accepted")).toBeVisible()
        await expect(memberPage.getByRole("button", { name: "Accept Quote" })).not.toBeVisible()
    })
})

async function injectRequesterIdIntoSendRequest(
    page: Page,
    onCreated: (request: CreatedRequest) => void
) {
    await page.route("**/api/requests", async (route) => {
        if (route.request().method() !== "POST") {
            await route.continue()
            return
        }

        const payload = await route.request().postDataJSON()
        const response = await route.fetch({
            postData: JSON.stringify({
                ...payload,
                requesterId: E2E_AUTH_ACCOUNTS.member.userId,
            }),
            headers: {
                ...route.request().headers(),
                "content-type": "application/json",
            },
        })
        const json = await response.json()
        onCreated({ id: json.data.id, reqNumber: json.data.reqNumber })
        await route.fulfill({
            response,
            body: JSON.stringify(json),
            headers: { ...response.headers(), "content-type": "application/json" },
        })
    })
}

async function mockLegalDocuments(page: Page) {
    await page.route(`**/api/organizations/${E2E_ORG_ID}/legal-documents`, (route) =>
        fulfillJson(route, {
            documents: [
                {
                    id: E2E_LEGAL_DOCUMENT_ID,
                    organizationId: E2E_ORG_ID,
                    label: "E2E Terms of Service",
                    sizeBytes: 4096,
                    mimeType: "application/pdf",
                    originalFilename: "e2e-terms.pdf",
                    uploadedById: E2E_AUTH_ACCOUNTS.admin.userId,
                    uploadedByName: E2E_AUTH_ACCOUNTS.admin.name,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ],
            totalSizeBytes: 4096,
            quotaBytes: 10485760,
        })
    )
}

async function mockQuoteSubmission(
    page: Page,
    onSubmit: (payload: QuoteSubmissionPayload) => void
) {
    await page.route("**/api/pricing-intelligence/suggest", (route) =>
        fulfillJson(route, { success: true, data: [] })
    )
    await page.route("**/api/quotes", async (route) => {
        if (route.request().method() !== "POST") {
            await route.continue()
            return
        }

        onSubmit((await route.request().postDataJSON()) as QuoteSubmissionPayload)
        await fulfillJson(route, { success: true, message: "Quote created and sent successfully" }, 201)
    })
}

async function mockAcceptedQuoteFlow(
    page: Page,
    request: CreatedRequest,
    quotePayload: QuoteSubmissionPayload
) {
    let status: "sent" | "accepted" = "sent"

    await page.route("**/api/requests?**", async (route) => {
        const url = new URL(route.request().url())

        if (
            route.request().method() !== "GET" ||
            url.searchParams.get("scope") !== "personal"
        ) {
            await route.continue()
            return
        }

        await fulfillJson(route, {
            data: {
                requests: [buildPersonalRequestListItem(request, quotePayload)],
                pagination: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                },
            },
        })
    })

    await page.route(`**/api/requests/by-number/${request.reqNumber}**`, async (route) => {
        const response = await route.fetch()
        const json = await response.json()
        json.data.status = "quoted"
        await route.fulfill({
            response,
            body: JSON.stringify(json),
            headers: { ...response.headers(), "content-type": "application/json" },
        })
    })

    await page.route(`**/api/quotes/request/${request.id}`, (route) =>
        fulfillJson(route, { data: [buildQuote(request.id, status, quotePayload)] })
    )

    await page.route("**/api/quotes/e2e-quote-id/accept", (route) => {
        if (status === "accepted") {
            return fulfillJson(route, { success: false, message: "Quote cannot be accepted twice" }, 400)
        }

        status = "accepted"
        return fulfillJson(route, { success: true, message: "Quote accepted" })
    })
}

async function openRequestFromOrganizationList(page: Page, requestSearchTerm: string) {
    await page.goto(`/org/${E2E_ORG_SLUG}/requests?search=${encodeURIComponent(requestSearchTerm)}`)
    await openRequestFromCurrentList(page, requestSearchTerm)
}

async function openAssignRequestDialog(page: Page, requestSearchTerm: string) {
    await page.goto(`/org/${E2E_ORG_SLUG}/requests?search=${encodeURIComponent(requestSearchTerm)}`)
    const row = page.getByRole("row", { name: new RegExp(requestSearchTerm) })
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("menuitem", { name: "Assign request" }).click()
}

async function openRequestFromCurrentList(page: Page, requestSearchTerm: string) {
    const row = page.getByRole("row", { name: new RegExp(requestSearchTerm) })
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("menuitem", { name: /Open (request|quote)/ }).click()
}

function getDisplayedRequestNumber(reqNumber: string) {
    return reqNumber.replace(/^REQ-/, "")
}

function buildPersonalRequestListItem(request: CreatedRequest, payload: QuoteSubmissionPayload) {
    return {
        id: request.id,
        reqNumber: request.reqNumber,
        status: "quoted",
        categories: payload.selectedCategories,
        services: payload.selectedServices.map((service) => service.serviceId),
        conversationId: null,
        comments: payload.description ?? null,
        fromDate: new Date().toISOString(),
        toDate: new Date(Date.now() + 86_400_000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: "high",
        requester: {
            id: E2E_AUTH_ACCOUNTS.member.userId,
            name: E2E_AUTH_ACCOUNTS.member.name,
            email: E2E_AUTH_ACCOUNTS.member.email,
            image: null,
        },
        assignedTo: {
            id: E2E_AUTH_ACCOUNTS.member.userId,
            name: E2E_AUTH_ACCOUNTS.member.name,
            email: E2E_AUTH_ACCOUNTS.member.email,
            role: "member",
            image: null,
        },
        organization: {
            id: E2E_ORG_ID,
            name: "E2E Test Org",
            slug: E2E_ORG_SLUG,
            logo: null,
        },
    }
}

function buildQuote(
    requestId: string,
    status: "sent" | "accepted",
    payload: QuoteSubmissionPayload
) {
    return {
        id: "e2e-quote-id",
        quoteNumber: "Q-E2E-001",
        requestId,
        organizationId: E2E_ORG_ID,
        createdById: E2E_AUTH_ACCOUNTS.admin.userId,
        cargoTypes: payload.selectedCategories,
        services: payload.selectedServices,
        cargoDetails: payload.cargoDetails,
        timing: {
            fromDate: new Date().toISOString(),
            toDate: new Date(Date.now() + 86_400_000).toISOString(),
        },
        documents: [],
        comments: null,
        pricing: {
            vatRate: payload.vatRate,
            totalHT: payload.totalHT,
            totalTTC: payload.totalTTC,
            vatAmount: payload.vatAmount,
            services: [
                {
                    id: "e2e-freight-service",
                    name: "E2E Freight Forwarding",
                    price: payload.totalHT,
                },
            ],
            currency: "EUR",
        },
        description: payload.description ?? null,
        terms: null,
        validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        status,
        version: 1,
        respondedAt: status === "accepted" ? new Date().toISOString() : null,
        respondedById: status === "accepted" ? E2E_AUTH_ACCOUNTS.member.userId : null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        legalDocuments: [
            {
                id: E2E_LEGAL_DOCUMENT_ID,
                label: "E2E Terms of Service",
                originalFilename: "e2e-terms.pdf",
                sizeBytes: 4096,
                downloadUrl: "https://example.test/e2e-terms.pdf",
                downloadUrlExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            },
        ],
    }
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
    await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
    })
}
