import { writeAllRoleStorageStates } from "./fixtures/api.fixture"

export default async function globalSetup() {
    const startedAt = performance.now()

    await writeAllRoleStorageStates()

    const durationMs = performance.now() - startedAt
    if (durationMs > 30_000) {
        throw new Error(
            `E2E global setup exceeded the 30s budget (${Math.round(durationMs)}ms)`
        )
    }
}
