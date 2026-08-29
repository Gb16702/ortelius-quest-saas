/**
 * Provides the `MatcherState.utils` surface that `@testing-library/jest-dom` expects.
 *
 * `bun:test` does not ship the jest-style `utils` (color helpers, `matcherHint`, `stringify`,
 * `diff`, etc.), so jest-dom matchers crash with `context.utils.EXPECTED_COLOR is not a function`
 * when they try to format an assertion failure message. We polyfill a no-op color helpers and
 * cheap string formatters so the failure message renders instead of throwing.
 */

const identity = (text: unknown): string => String(text)

function safeStringify(value: unknown): string {
    if (typeof value === "string") return value
    try {
        return JSON.stringify(value, null, 2) ?? String(value)
    } catch {
        return String(value)
    }
}

function matcherHint(name: string, received = "received", expected = "expected"): string {
    return `expect(${received}).${name}(${expected})`
}

function printValue(value: unknown): string {
    return safeStringify(value)
}

function printWithType(label: string, value: unknown, _print: (value: unknown) => string): string {
    return `${label}: ${typeof value} ${safeStringify(value)}`
}

function diff(a: unknown, b: unknown): string {
    return `expected: ${safeStringify(a)}\nreceived: ${safeStringify(b)}`
}

export const jestDomMatcherUtils = {
    EXPECTED_COLOR: identity,
    RECEIVED_COLOR: identity,
    DIM_COLOR: identity,
    INVERTED_COLOR: identity,
    BOLD_WEIGHT: identity,
    matcherHint,
    printReceived: printValue,
    printExpected: printValue,
    printWithType,
    stringify: safeStringify,
    diff,
}

export type JestDomMatcherUtils = typeof jestDomMatcherUtils
