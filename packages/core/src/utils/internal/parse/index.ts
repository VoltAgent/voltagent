import devLogger from "../dev-logger";
import { isString } from "../utils";

export type JsonLike = object | [];

/**
 * Safely parse a JSON string
 * @param json - The JSON string to parse
 * @returns The parsed JSON or null if parsing fails
 */
export function safeParseJson<T extends JsonLike>(json: string): T | null {
  try {
    if (!isJsonLikeString(json)) {
      devLogger.warn("Invalid JSON string", {
        json,
      });
      return null;
    }
    return JSON.parse(json) as T;
  } catch (error) {
    devLogger.error("Failed to parse JSON", {
      error,
      json,
    });
    return null;
  }
}

/**
 * Safely parse a value
 * @param input - The value to parse
 * @returns The parsed value or the original value if parsing fails
 */
export function safeParse<T>(input: unknown): T | null {
  try {
    return JSON.parse(input as string) as T;
  } catch (error) {
    devLogger.error("Failed to parse value", {
      error,
      input,
    });
    return null;
  }
}

/**
 * Type guard to check if a value is a string that can be parsed as JSON
 * @param input - The value to check
 * @returns True if the value is a string that can be parsed as JSON, false otherwise
 */
export function isJsonLikeString(input: unknown): input is string {
  if (!isString(input)) {
    return false;
  }
  const trimmedValue = input.trim();
  return [
    trimmedValue.startsWith("{") && trimmedValue.endsWith("}"),
    trimmedValue.startsWith("[") && trimmedValue.endsWith("]"),
  ].every((x) => x === true);
}
