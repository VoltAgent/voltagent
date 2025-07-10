import type * as TF from "type-fest";

export type UserContextInput =
  | UserContextData
  | UserContext
  | Iterable<
      [TF.StringKeyOf<UserContextData>, TF.Get<UserContextData, TF.StringKeyOf<UserContextData>>]
    >;

/**
 * The user context is a collection of data that is specific to the operation context,
 * that is handled by either the agent, tool, developer, or user.
 *
 * NOTE: This API mirrors the Map in JS intentionally as a Map is used under the hood.
 */
export interface UserContext {
  /**
   * Get a value from the user context.
   *
   * @param key - The key to get the value for.
   * @returns The value, or null if the key is not found.
   */
  get<KEY extends TF.StringKeyOf<UserContextData>>(key: KEY): TF.Get<UserContextData, KEY> | null;
  /**
   * Set a value in the user context.
   *
   * @param key - The key to set the value for.
   * @param value - The value to set.
   */
  set<KEY extends TF.StringKeyOf<UserContextData>>(
    key: KEY,
    value: TF.Get<UserContextData, KEY>,
  ): void;
  /**
   * Delete a value from the user context.
   *
   * @param key - The key to delete the value for.
   */
  delete<KEY extends TF.StringKeyOf<UserContextData>>(key: KEY): void;
  /**
   * Clear the user context.
   */
  clear(): void;
  /**
   * Get an iterator of the user context entries.
   *
   * @returns An iterator of the user context entries.
   */
  entries<
    KEY extends TF.StringKeyOf<UserContextData>,
    VALUE extends TF.Get<UserContextData, KEY>,
  >(): IterableIterator<[KEY, VALUE]>;
  /**
   * Get an iterator of the user context keys.
   *
   * @returns An iterator of the user context keys.
   */
  keys(): MapIterator<TF.StringKeyOf<UserContextData>>;
  /**
   * Get an iterator of the user context values.
   *
   * @returns An iterator of the user context values.
   */
  values(): MapIterator<TF.Get<UserContextData, TF.StringKeyOf<UserContextData>>>;
  /**
   * Check if the user context has a key.
   *
   * @param key - The key to check.
   * @returns True if the key is in the user context, false otherwise.
   */
  has(key: TF.StringKeyOf<UserContextData>): boolean;
}

/**
 * An overridable interface that can be used to extend the types of the user context using type augmentation.
 *
 * @example
 * ```ts
 * declare module "@voltagent/core" {
 *   interface UserContextData {
 *     foo: string;
 *   }
 * }
 *
 * // This will return a string | null
 * const foo = operationContext.userContext.get("foo");
 * ```
 */
export interface UserContextData {
  [key: string]: unknown;
}
