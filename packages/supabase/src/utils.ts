/**
 * Safely parse an error message
 * @param err - The error to parse
 * @param defaultMessage - The default message to return if the error is not an instance of Error
 * @returns The error message or the default message
 */
export function safeParseError(err: unknown, defaultMessage = "Unknown error"): Error {
  if (err instanceof Error) {
    return err;
  }

  return new Error(defaultMessage);
}
