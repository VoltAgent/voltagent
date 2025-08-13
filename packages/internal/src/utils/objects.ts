import type { SetRequired } from "type-fest";
import type { PlainObject } from "../types";
import { isObject } from "./lang";

/**
 * Deep clone an object
 *
 * @param obj - The object to clone
 * @returns A deep copy of the object (fallback to shallow clone for failures)
 */
export function deepClone<T>(obj: T): T {
  try {
    // Use structuredClone if available (Node.js 17+, modern browsers)
    if (typeof structuredClone === "function") {
      return structuredClone(obj);
    }

    throw new Error("structuredClone is not available");
  } catch (_error) {
    // Fallback to shallow clone for primitive types and simple objects
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    return { ...obj } as T;
  }
}

/**
 * Check if an object has a key
 *
 * @param obj - The object to check
 * @param key - The key to check
 * @returns True if the object has the key, false otherwise
 */
export function hasKey<T extends PlainObject, K extends string>(
  obj: T,
  key: K,
): obj is T & SetRequired<T, K> {
  return isObject(obj) && key in obj;
}
