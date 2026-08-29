import { describe, expect, it } from "bun:test"
import {
    DEFAULT_DASHBOARD_PERIOD,
    getDashboardTimePeriodFromSearchParams,
    parseDashboardTimePeriod,
} from "../dashboard-time-period"

describe("dashboard time period parsing", () => {
    it("accepts supported dashboard periods", () => {
        expect(parseDashboardTimePeriod("7")).toBe(7)
        expect(parseDashboardTimePeriod("30")).toBe(30)
        expect(parseDashboardTimePeriod(365)).toBe(365)
    })

    it("falls back to the default period for unsupported URL values", () => {
        expect(getDashboardTimePeriodFromSearchParams(new URLSearchParams("period=999"))).toBe(
            DEFAULT_DASHBOARD_PERIOD
        )
        expect(getDashboardTimePeriodFromSearchParams(new URLSearchParams("period=all"))).toBe(
            DEFAULT_DASHBOARD_PERIOD
        )
        expect(getDashboardTimePeriodFromSearchParams(new URLSearchParams())).toBe(
            DEFAULT_DASHBOARD_PERIOD
        )
    })
})
