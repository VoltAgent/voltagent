import type { SetRequired } from "type-fest";
import type { PlainObject } from "../types";
import { isObject } from "./lang";

/**
 * Deep clone an object
 *
 * @param obj - The object to clone
 * @returns A deep copy of the object, preserving functions by reference in the fallback
 */
export function deepClone<T>(obj: T): T {
  try {
    // Use structuredClone if available (Node.js 17+, modern browsers)
    if (typeof structuredClone === "function") {
      return structuredClone(obj);
    }

    throw new Error("structuredClone is not available");
  } catch (_error) {
    return cloneFallback(obj);
  }
}

/** Clone nested data when structuredClone rejects a value such as a function. */
function cloneFallback<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return seen.get(value) as T;
  }

  let clone: object;
  if (value instanceof Date) {
    clone = new Date(value.getTime());
  } else if (value instanceof RegExp) {
    clone = new RegExp(value.source, value.flags);
  } else if (value instanceof Map) {
    clone = new Map();
  } else if (value instanceof Set) {
    clone = new Set();
  } else if (
    value instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer)
  ) {
    clone =
      value instanceof ArrayBuffer
        ? ArrayBuffer.prototype.slice.call(value, 0)
        : SharedArrayBuffer.prototype.slice.call(value, 0);
  } else if (ArrayBuffer.isView(value)) {
    const buffer = cloneFallback(value.buffer, seen);
    // Cloning the buffer's own properties may already have cloned this view.
    if (seen.has(value)) {
      return seen.get(value) as T;
    }
    if (value instanceof DataView) {
      clone = new DataView(buffer, value.byteOffset, value.byteLength);
    } else {
      const TypedArray = value.constructor as {
        new (buffer: ArrayBufferLike, byteOffset: number, length: number): ArrayBufferView;
        readonly BYTES_PER_ELEMENT: number;
      };
      clone = new TypedArray(
        buffer,
        value.byteOffset,
        value.byteLength / TypedArray.BYTES_PER_ELEMENT,
      );
    }
  } else {
    clone = Array.isArray(value) ? new Array(value.length) : {};
  }
  seen.set(value, clone);

  if (value instanceof Map && clone instanceof Map) {
    for (const [key, nested] of value) {
      clone.set(cloneFallback(key, seen), cloneFallback(nested, seen));
    }
  } else if (value instanceof Set && clone instanceof Set) {
    for (const nested of value) {
      clone.add(cloneFallback(nested, seen));
    }
  } else {
    for (const [key, nested] of Object.entries(value)) {
      Object.defineProperty(clone, key, {
        value: cloneFallback(nested, seen),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  return clone as T;
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
