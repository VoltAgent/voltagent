import { hasKey, isMap, isMapLike, isNil, isPlainObject } from "@voltagent/internal/utils";
import { match } from "ts-pattern";
// TODO: move OperationContext types here and any additional utils to this directory
import type { OperationContext } from "../types";
import type { UserContext, UserContextInput } from "./types";

/**
 * Create a user context, and initializes it with the provided data or an existing user context.
 *
 * @param data - The data to create the user context with.
 * @returns The user context.
 */
export function createUserContext(data?: UserContextInput): UserContext {
  const userContext = match(data)
    .returnType<UserContext>()
    .when(
      (d) => Array.isArray(d),
      (d) => createUserContextMap(d),
    )
    .when(
      (d) => isPlainObject(d),
      (d) => createUserContextMap(d),
    )
    .when(
      (d) => isUserContext(d),
      (d) => createUserContextMap(d),
    )
    .otherwise(() => createUserContextMap());

  // @ts-expect-error - we are adding a tagged type to allow for proper type guard at runtime
  userContext[userContextTag] = true;

  return userContext;
}

/**
 * Resolve the user context from the operation context, if it doesn't exist a new one is created.
 *
 * @param operationContext - The operation context to resolve the user context from.
 * @returns The user context, or null if the operation context is not provided.
 */
export function resolveUserContext(operationContext?: OperationContext | null): UserContext {
  if (isNil(operationContext)) {
    return createUserContext();
  }
  return operationContext.userContext as UserContext;
}

/**
 * Check if the operation context has a user context.
 *
 * @param operationContext - The operation context to check.
 * @returns True if the operation context has a user context, false otherwise.
 */
export function hasUserContext(operationContext?: unknown): operationContext is {
  userContext: UserContext;
} {
  return (
    isPlainObject(operationContext) &&
    hasKey(operationContext, "userContext") &&
    !isNil(operationContext.userContext)
  );
}

/**
 * Check if a value is a user context.
 *
 * @param x - The value to check.
 * @returns True if the value is a user context, false otherwise.
 */
export function isUserContext(userContext: unknown): userContext is UserContext {
  if (!isMapLike(userContext)) {
    return false;
  }

  // @ts-expect-error - we are adding a tagged type to allow for proper type guard at runtime
  return userContext[userContextTag] === true;
}

const userContextTag = Symbol("user-context");

/**
 * Create a user context map.
 *
 * @param data - The data to create the user context map with.
 * @returns The user context map.
 */
function createUserContextMap(data?: unknown): UserContext {
  const input = match(data)
    .returnType<Iterable<[string, unknown]> | Map<unknown, unknown>>()
    .when(
      (d) => isPlainObject(d),
      (d) => Object.entries(d),
    )
    .when(
      (d) => Array.isArray(d),
      (d) => d,
    )
    .when(
      (d) => isMap(d),
      (d) => d,
    )
    .otherwise(() => []);

  return new Map<unknown, unknown>(input) as UserContext;
}
