import { describe, expect, it } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { createElement, type ReactNode } from "react"
import {
    type LegalDocument,
    type ListLegalDocumentsResponse,
    legalDocumentsQueryKey,
} from "@/entities/legal-document"
import { type OrganizationSetupStatus, organizationSetupKeys } from "@/entities/organization"
import { server } from "@/shared/test/msw/msw-server"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { useDeleteLegalDocument } from "../legal-documents.mutations"

const ORG_ID = "org-1"
const DOCUMENT_ID = "11111111-1111-4111-8111-111111111111"

const legalDocument: LegalDocument = {
    id: DOCUMENT_ID,
    organizationId: ORG_ID,
    label: "Terms",
    sizeBytes: 128,
    mimeType: "application/pdf",
    originalFilename: "terms.pdf",
    uploadedById: "user-1",
    uploadedByName: "Ada",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
}

const legalDocuments: ListLegalDocumentsResponse = {
    documents: [legalDocument],
    totalSizeBytes: legalDocument.sizeBytes,
    quotaBytes: 1024,
}

const setupStatus: OrganizationSetupStatus = {
    hasLogo: true,
    hasTagline: true,
    hasOverview: true,
    hasServices: true,
    hasCargoTypes: true,
    hasVatConfig: true,
    hasLegalDocuments: true,
    memberCount: 2,
    isComplete: true,
}

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
            mutations: { retry: false },
        },
    })
}

function createWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return createElement(QueryClientProvider, { client: queryClient }, children)
    }
}

describe("legal documents mutations", () => {
    setupMswServer()

    it("updates the setup status cache optimistically when the last legal document is deleted", async () => {
        let resolveDelete!: () => void
        const deleteGate = new Promise<void>((resolve) => {
            resolveDelete = resolve
        })
        const queryClient = createQueryClient()
        const documentsQueryKey = legalDocumentsQueryKey(ORG_ID)
        const setupQueryKey = organizationSetupKeys.detail(ORG_ID)
        queryClient.setQueryData(documentsQueryKey, legalDocuments)
        queryClient.setQueryData(setupQueryKey, setupStatus)

        server.use(
            http.delete(
                `http://localhost/api/organizations/${ORG_ID}/legal-documents/${DOCUMENT_ID}`,
                async () => {
                    await deleteGate
                    return HttpResponse.json({ success: true })
                }
            )
        )

        const { result } = renderHook(() => useDeleteLegalDocument(ORG_ID), {
            wrapper: createWrapper(queryClient),
        })

        const mutationPromise = result.current.mutateAsync(DOCUMENT_ID)

        await waitFor(() => {
            expect(
                queryClient.getQueryData<OrganizationSetupStatus>(setupQueryKey)?.hasLegalDocuments
            ).toBe(false)
        })

        resolveDelete()
        await mutationPromise
    })
})
