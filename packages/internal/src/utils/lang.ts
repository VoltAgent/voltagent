import type { EmptyObject } from "type-fest";
import type { AnyFunction, Nil, PlainObject } from "../types";

/**
 * Check if a value is nil
 *
 * @param obj - The value to check
 * @returns True if the value is nil, false otherwise
 */
export function isNil(obj: unknown): obj is Nil {
  return obj === null || obj === undefined;
}

/**
 * Check if an object is a JS object
 *
 * @param obj - The object to check
 * @returns True if the object is a JS object}
 */
export function isObject<T extends object>(obj: unknown): obj is T {
  return (typeof obj === "object" || typeof obj === "function") && !isNil(obj);
}

/**
 * Check if a value is a function
 *
 * @param obj - The value to check
 * @returns True if the value is a function, false otherwise
 */
export function isFunction<T extends AnyFunction>(obj: unknown): obj is T {
  return typeof obj === "function";
}

/**
 * Check if an object is a plain object (i.e. a JS object but not including arrays or functions)
 *
 * @param obj - The object to check
 * @returns True if the object is a plain object, false otherwise.
 */
export function isPlainObject<T extends PlainObject>(obj: unknown): obj is T {
  if (!isObject(obj)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(obj);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Check if an object is an empty object
 *
 * @param obj - The object to check
 * @returns True if the object is an empty object, false otherwise
 */
export function isEmptyObject(obj: unknown): obj is EmptyObject {
  if (!isObject(obj)) {
    return false;
  }

  // Check for own string and symbol properties (enumerable or not)
  if (Object.getOwnPropertyNames(obj).length > 0 || Object.getOwnPropertySymbols(obj).length > 0) {
    return false;
  }

  return true;
}
