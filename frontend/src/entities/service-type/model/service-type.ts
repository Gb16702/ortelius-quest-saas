export const SERVICE_TYPES = ["cargo", "storage", "logistics", "port"] as const

export type ServiceType = (typeof SERVICE_TYPES)[number]

export function isServiceType(value: string | undefined): value is ServiceType {
    return value === "cargo" || value === "storage" || value === "logistics" || value === "port"
}
