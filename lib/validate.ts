// Runtime type/length validation for API route bodies. req.json() returns
// whatever the client sent — TypeScript types are erased, so every field must
// be checked before .trim()/.join() calls that would otherwise throw a 500.

interface StringFieldOpts {
  required?: boolean
  maxLength: number
}

/**
 * Returns an error message if the parsed request body isn't a plain object
 * (e.g. `null`, an array, or a bare primitive), or null if it's fine to
 * destructure. `req.json()` parses the literal `null` successfully, so the
 * JSON.parse try/catch never catches it — without this check, destructuring
 * fields off `null` throws and the route 500s instead of returning a clean 400.
 */
export function invalidRequestBody(body: unknown): string | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid request body"
  }
  return null
}

/** Returns an error message for an invalid field, or null if valid. */
export function invalidStringField(
  value: unknown,
  name: string,
  opts: StringFieldOpts
): string | null {
  if (value === undefined || value === null) {
    return opts.required ? `${name} is required` : null
  }
  if (typeof value !== "string") {
    return `${name} must be a string`
  }
  if (opts.required && !value.trim()) {
    return `${name} is required`
  }
  if (value.length > opts.maxLength) {
    return `${name} must be under ${opts.maxLength} characters`
  }
  return null
}

/** Returns the sanitized terms array, or an error message string. */
export function sanitizeTerms(
  value: unknown,
  maxTerms = 50,
  maxTermLength = 100
): string[] | { error: string } {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || !value.every((t) => typeof t === "string")) {
    return { error: "importantTerms must be an array of strings" }
  }
  return value.slice(0, maxTerms).map((t) => t.slice(0, maxTermLength))
}
