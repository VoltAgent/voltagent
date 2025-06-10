/**
 * Type guard to check if a value is a Date
 * @param value - The value to check
 * @returns True if the value is a Date, false otherwise
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

/**
 * Type guard to check if a value is a string
 * @param value - The value to check
 * @returns True if the value is a string, false otherwise
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if a value is an object
 * @param value - The value to check
 * @returns True if the value is an object, false otherwise
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if an object has a key
 * @param obj - The object to check
 * @param key - The key to check
 * @returns True if the object has the key, false otherwise
 */
export function hasKey<T, K extends string>(obj: T, key: K): obj is T & Record<K, unknown> {
  return isObject(obj) && key in obj;
}
