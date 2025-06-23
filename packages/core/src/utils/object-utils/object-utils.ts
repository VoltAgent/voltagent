/**
 * Object manipulation utility functions
 */

import { devLogger } from "@voltagent/internal/dev";

/**
 * Deep clone an object using JSON serialization with fallback to shallow clone
 *
 * @param obj - The object to clone
 * @returns A deep copy of the object, or shallow copy if JSON serialization fails
 */
export function deepClone<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    devLogger.warn("Failed to deep clone object, using shallow clone:", error);
    // Fallback to shallow clone for primitive types and simple objects
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    return { ...obj } as T;
  }
}
