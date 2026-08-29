import { queryOptions, useQuery } from "@tanstack/react-query"
import type { OrganizationInfo } from "../model/organization-info.schema"
import { organizationInfoKeys, organizationInfoQueryOptions } from "./organization-info.query"

export interface OrganizationBrandingSettings
    extends Pick<
        OrganizationInfo,
        "id" | "name" | "slug" | "logo" | "tagline" | "overview" | "website" | "brandColor" | "font"
    > {}

export interface OrganizationBusinessSettings
    extends Pick<OrganizationInfo, "id" | "slug" | "emailIntakeEnabled"> {}

export interface OrganizationBillingSettings
    extends Pick<OrganizationInfo, "id" | "taxIdType" | "taxIdNumber"> {}

export const organizationSettingsKeys = {
    all: organizationInfoKeys.all,
    detail: (organizationId: string | null | undefined) =>
        organizationInfoKeys.detail(organizationId),
}

export function toOrganizationBrandingSettings(
    organization: OrganizationInfo
): OrganizationBrandingSettings {
    return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        tagline: organization.tagline,
        overview: organization.overview,
        website: organization.website,
        brandColor: organization.brandColor,
        font: organization.font,
    }
}

export function toOrganizationBusinessSettings(
    organization: OrganizationInfo
): OrganizationBusinessSettings {
    return {
        id: organization.id,
        slug: organization.slug,
        emailIntakeEnabled: organization.emailIntakeEnabled,
    }
}

export function toOrganizationBillingSettings(
    organization: OrganizationInfo
): OrganizationBillingSettings {
    return {
        id: organization.id,
        taxIdType: organization.taxIdType,
        taxIdNumber: organization.taxIdNumber,
    }
}

// Backend currently serves these private settings from `/info`; select keeps
// page ownership narrow without duplicating the underlying network/cache entry.
export function organizationBrandingSettingsQueryOptions(organizationId: string | null) {
    return queryOptions({
        ...organizationInfoQueryOptions(organizationId),
        select: toOrganizationBrandingSettings,
    })
}

export function organizationBusinessSettingsQueryOptions(organizationId: string | null) {
    return queryOptions({
        ...organizationInfoQueryOptions(organizationId),
        select: toOrganizationBusinessSettings,
    })
}

export function organizationBillingSettingsQueryOptions(organizationId: string | null) {
    return queryOptions({
        ...organizationInfoQueryOptions(organizationId),
        select: toOrganizationBillingSettings,
    })
}

export function useOrganizationBrandingSettings(organizationId: string | null) {
    return useQuery({
        ...organizationBrandingSettingsQueryOptions(organizationId),
        enabled: !!organizationId,
    })
}

export function useOrganizationBusinessSettings(organizationId: string | null) {
    return useQuery({
        ...organizationBusinessSettingsQueryOptions(organizationId),
        enabled: !!organizationId,
    })
}

export function useOrganizationBillingSettings(organizationId: string | null) {
    return useQuery({
        ...organizationBillingSettingsQueryOptions(organizationId),
        enabled: !!organizationId,
    })
}
