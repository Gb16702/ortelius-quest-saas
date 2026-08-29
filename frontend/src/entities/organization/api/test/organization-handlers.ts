import { HttpResponse, http } from "msw"
import { createOrganization } from "../../model/test/organization.factory"

export const organizationHandlers = [
    // Mirrors fetchOrganizationInfo / fetchOrganizationInfoServer in
    // src/entities/organization/api/organization-info.*.ts — production fetches
    // `/api/organizations/${organizationId}/info`, not `/api/organizations/:slug`.
    http.get("/api/organizations/:organizationId/info", () =>
        HttpResponse.json({ success: true, data: createOrganization() })
    ),
]
