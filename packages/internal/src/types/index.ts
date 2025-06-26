/**
 * This type is used to allow any type and bypass restrictions used in
 * typechecking and linting. Provides a CLEAR warning this is NOT the desired
 * behavior and is a dangerous practice.
 */
export type DangerouslyAllowAny = any;

/**
 * A plain object is an object that has no special properties or methods,
 * and just has properties that are strings, numbers, or symbols.
 */
export type PlainObject = Record<string | number | symbol, unknown>;

/**
 * A nil value is a value that is not defined or is undefined.
 */
export type Nil = null | undefined;

/**
 * A type that represents any async function.
 */
export type AnyAsyncFunction = (...args: unknown[]) => Promise<unknown>;

/**
 * A type that represents any synchronous function.
 */
export type AnySyncFunction = (...args: unknown[]) => unknown;

/**
 * A type that represents any function.
 */
export type AnyFunction = AnyAsyncFunction | AnySyncFunction;
