import type { PlainObject } from "../types";
import { isNil } from "../utils/lang";

/**
 * Resolve a configuration object by merging overrides on top of defaults.
 *
 * Only non-nil override values win, so `undefined` and `null` fall back to the
 * default (the same semantics as `override ?? default`). Falsy values such as
 * `false`, `0` and `""` are kept. The merge is shallow and `defaults` is never
 * mutated.
 *
 * @param defaults - The default configuration values
 * @param overrides - The values to apply on top of the defaults
 * @returns A new object with the resolved configuration
 */
export function resolveConfig<T extends PlainObject>(
  defaults: T,
  overrides?: Partial<T> | null,
): T {
  const resolved: T = { ...defaults };

  if (isNil(overrides)) {
    return resolved;
  }

  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const value = overrides[key];
    if (!isNil(value)) {
      resolved[key] = value as T[keyof T];
    }
  }

  return resolved;
}
