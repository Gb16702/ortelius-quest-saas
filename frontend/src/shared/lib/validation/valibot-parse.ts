import * as v from "valibot"

interface ValidationIssue {
    code: string
    message: string
    path: Array<string | number>
}

interface SafeParseSuccess<T> {
    success: true
    data: T
    output: T
}

interface SafeParseFailure {
    success: false
    error: ValidationError
    issues: ValidationIssue[]
}

export class ValidationError extends Error {
    issues: ValidationIssue[]

    constructor(issues: v.BaseIssue<unknown>[]) {
        super(issues[0]?.message ?? "Validation failed")
        this.name = "ValidationError"
        this.issues = issues.map(normalizeIssue)
    }

    flatten<T>(mapper: (issue: ValidationIssue) => T): T[] {
        return this.issues.map(mapper)
    }
}

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure

function normalizeIssue(issue: v.BaseIssue<unknown>): ValidationIssue {
    return {
        code: normalizeIssueCode(issue),
        message: issue.message,
        path:
            issue.path?.flatMap((item) =>
                typeof item.key === "string" || typeof item.key === "number" ? [item.key] : []
            ) ?? [],
    }
}

function normalizeIssueCode(issue: v.BaseIssue<unknown>): string {
    if (issue.kind === "schema") return "invalid_type"
    if (issue.kind === "validation" && issue.type === "email") return "invalid_format"
    if (issue.kind === "validation" && issue.type === "url") return "invalid_format"
    if (issue.kind === "validation" && issue.type === "check") return "custom"
    return issue.kind
}

export function parseSchema<TSchema extends v.GenericSchema>(
    schema: TSchema,
    input: unknown
): v.InferOutput<TSchema> {
    try {
        return v.parse(schema, input)
    } catch (error) {
        if (v.isValiError(error)) {
            throw new ValidationError(error.issues)
        }

        throw error
    }
}

export function safeParseSchema<TSchema extends v.GenericSchema>(
    schema: TSchema,
    input: unknown
): SafeParseResult<v.InferOutput<TSchema>> {
    const result = v.safeParse(schema, input)

    if (result.success) {
        return {
            success: true,
            data: result.output,
            output: result.output,
        }
    }

    const error = new ValidationError(result.issues)

    return {
        success: false,
        error,
        issues: error.issues,
    }
}
