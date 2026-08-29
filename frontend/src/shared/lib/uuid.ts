export type UUID = ReturnType<Crypto["randomUUID"]>

export function generateUUID(): UUID {
    if (typeof globalThis.crypto?.randomUUID !== "function") {
        throw new Error("crypto.randomUUID is unavailable")
    }

    return globalThis.crypto.randomUUID()
}
