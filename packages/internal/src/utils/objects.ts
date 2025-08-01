import type { SetRequired } from "type-fest";
import type { Logger } from "../logger/types";
import type { PlainObject } from "../types";
import { isObject } from "./lang";

/**
 * Deep clone an object using JSON serialization with fallback to shallow clone
 *
 * @param obj - The object to clone
 * @param logger - Optional logger for warnings
 * @returns A deep copy of the object, or shallow copy if JSON serialization fails
 */
export function deepClone<T>(obj: T, logger?: Logger): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    if (logger) {
      logger.warn("Failed to deep clone object, using shallow clone", { error });
    }
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
