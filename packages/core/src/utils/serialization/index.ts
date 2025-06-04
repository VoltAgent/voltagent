/**
 * Safely parse JSON string. If parsing fails, returns the original value.
 * @param value String to parse as JSON
 * @returns Parsed JSON object or original value if parsing fails
 */
export function safeJsonParse(value: string | null | undefined): any {
  if (!value) return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Helper function to safely serialize complex values for debugging
export function serializeValueForDebug(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return value;
  }
  if (type === "function") {
    // Assert the type to access the optional name property
    return `[Function: ${(value as { name?: string }).name || "anonymous"}]`;
  }
  if (type === "symbol") {
    return value.toString(); // e.g., "Symbol(description)"
  }
  if (type === "object") {
    if (value instanceof Date) {
      return `[Date: ${value.toISOString()}]`;
    }
    if (value instanceof RegExp) {
      return `[RegExp: ${value.toString()}]`;
    }
    if (value instanceof Map) {
      return `[Map size=${value.size}]`; // Avoid serializing potentially complex Map values
    }
    if (value instanceof Set) {
      return `[Set size=${value.size}]`; // Avoid serializing potentially complex Set values
    }
    if (Array.isArray(value)) {
      // For arrays, serialize elements recursively, but keep it as an array
      // Limit depth or size if needed to prevent large payloads
      return value.map(serializeValueForDebug);
    }
    // For plain objects, try to serialize, but handle potential errors
    try {
      // Basic check for prototype to differentiate plain objects from class instances
      if (Object.getPrototypeOf(value) === Object.prototype) {
        // Attempt to stringify/parse to handle simple cases, could use a more robust method
        // This basic version might still fail on circular refs within plain objects
        // Consider a library or depth limiting for robustness
        return JSON.parse(JSON.stringify(value));
      }
      // For class instances
      return `[Object: ${value.constructor?.name || "UnknownClass"}]`;
    } catch (e) {
      return `[SerializationError: ${e instanceof Error ? e.message : "Unknown"}]`;
    }
  }
  return `[Unsupported Type: ${type}]`;
}
