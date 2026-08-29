import { createAvatar } from "@dicebear/core"
import * as initials from "@dicebear/initials"

export function generateAvatarUrl(name: string): string {
    const seed = name.trim()

    if (!seed) {
        throw new Error("Avatar fallback requires a non-empty name")
    }

    const avatar = createAvatar(initials, {
        seed,
        backgroundColor: ["EEEEEE"],
        fontFamily: ["system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        fontWeight: 500,
        textColor: ["171717"],
        fontSize: 40,
        chars: 1,
    })

    return avatar.toDataUri()
}
