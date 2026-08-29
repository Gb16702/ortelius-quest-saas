import { debounce, parseAsString } from "nuqs"
import { ROLE_OPTIONS_WITH_OWNER } from "@/entities/access"
import {
    createCommaSeparatedEnumParser,
    createPageSizeParser,
    createPositiveIntegerParser,
    DEFAULT_PAGE_SIZE,
} from "@/shared/lib/url.state"

const ROLE_FILTER_VALUES = ROLE_OPTIONS_WITH_OWNER.map((role) => role.value)
const MEMBER_STATUS_FILTER_VALUES = ["accepted", "pending", "canceled"] as const
const INVITATION_STATUS_FILTER_VALUES = [
    "accepted",
    "pending",
    "canceled",
    "expired",
    "archived",
] as const

const ALL_ROLES = ROLE_FILTER_VALUES.join(",")
const ALL_MEMBER_STATUSES = MEMBER_STATUS_FILTER_VALUES.join(",")
const ALL_INVITATION_STATUSES = INVITATION_STATUS_FILTER_VALUES.join(",")

export const FILTER_STATES = {
    ROLES: {
        ALL: ALL_ROLES,
        EMPTY: "empty",
        DEFAULT: ALL_ROLES,
    },
    MEMBER_STATUS: {
        ALL: ALL_MEMBER_STATUSES,
        INVITATIONS_ALL: ALL_INVITATION_STATUSES,
        EMPTY: "empty",
        DEFAULT_MEMBERS: ALL_MEMBER_STATUSES,
        DEFAULT_INVITATIONS: ALL_INVITATION_STATUSES,
    },
} as const

const roleFilterParser = createCommaSeparatedEnumParser([
    ...ROLE_FILTER_VALUES,
    FILTER_STATES.ROLES.EMPTY,
]).withDefault(FILTER_STATES.ROLES.DEFAULT)

const memberStatusParser = createCommaSeparatedEnumParser([
    ...MEMBER_STATUS_FILTER_VALUES,
    FILTER_STATES.MEMBER_STATUS.EMPTY,
]).withDefault(FILTER_STATES.MEMBER_STATUS.DEFAULT_MEMBERS)

const invitationStatusParser = createCommaSeparatedEnumParser([
    ...INVITATION_STATUS_FILTER_VALUES,
    FILTER_STATES.MEMBER_STATUS.EMPTY,
]).withDefault(FILTER_STATES.MEMBER_STATUS.DEFAULT_INVITATIONS)

export function getRoleFilterApiParam(role: string): string {
    return !role || role === FILTER_STATES.ROLES.DEFAULT ? "" : role
}

export function getInvitationStatusFilterApiParam(status: string): string {
    return !status || status === FILTER_STATES.MEMBER_STATUS.DEFAULT_INVITATIONS ? "" : status
}

export const compoundParsers = {
    membersPageState: {
        page: createPositiveIntegerParser().withDefault(1).withOptions({ shallow: true }),
        limit: createPageSizeParser().withDefault(DEFAULT_PAGE_SIZE).withOptions({ shallow: true }),
        search: parseAsString.withDefault("").withOptions({
            shallow: true,
            limitUrlUpdates: debounce(400),
            clearOnDefault: true,
        }),
        role: roleFilterParser.withOptions({ shallow: true }),
        status: memberStatusParser.withOptions({ shallow: true }),
    },

    invitationsPageState: {
        page: createPositiveIntegerParser().withDefault(1).withOptions({ shallow: true }),
        limit: createPageSizeParser().withDefault(DEFAULT_PAGE_SIZE).withOptions({ shallow: true }),
        search: parseAsString.withDefault("").withOptions({
            shallow: true,
            limitUrlUpdates: debounce(400),
            clearOnDefault: true,
        }),
        role: roleFilterParser.withOptions({ shallow: true }),
        status: invitationStatusParser.withOptions({ shallow: true }),
    },
}

export function isDefaultMembersPageSearchParams(searchParams: URLSearchParams): boolean {
    const parsers = compoundParsers.membersPageState

    return (
        parsers.page.parseServerSide(searchParams.get("page") ?? undefined) === 1 &&
        parsers.limit.parseServerSide(searchParams.get("limit") ?? undefined) ===
            DEFAULT_PAGE_SIZE &&
        parsers.search.parseServerSide(searchParams.get("search") ?? undefined) === "" &&
        parsers.role.parseServerSide(searchParams.get("role") ?? undefined) ===
            FILTER_STATES.ROLES.DEFAULT &&
        parsers.status.parseServerSide(searchParams.get("status") ?? undefined) ===
            FILTER_STATES.MEMBER_STATUS.DEFAULT_MEMBERS
    )
}

export function isDefaultInvitationsPageSearchParams(searchParams: URLSearchParams): boolean {
    const parsers = compoundParsers.invitationsPageState

    return (
        parsers.page.parseServerSide(searchParams.get("page") ?? undefined) === 1 &&
        parsers.limit.parseServerSide(searchParams.get("limit") ?? undefined) ===
            DEFAULT_PAGE_SIZE &&
        parsers.search.parseServerSide(searchParams.get("search") ?? undefined) === "" &&
        parsers.role.parseServerSide(searchParams.get("role") ?? undefined) ===
            FILTER_STATES.ROLES.DEFAULT &&
        parsers.status.parseServerSide(searchParams.get("status") ?? undefined) ===
            FILTER_STATES.MEMBER_STATUS.DEFAULT_INVITATIONS
    )
}
