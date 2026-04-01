/**
 * Type guard to check if an error is a BailError
 */
export function isBailError(error: unknown): error is BailError {
  return error instanceof BailError;
}

/**
 * Creates a BailError.
 * @param agentName - The name of the subagent that bailed.
 * @param response - The response from the bailed subagent.
 * @returns BailError instance
 */
export function createBailError(agentName: string, response: string): BailError {
  return new BailError(agentName, response);
}

/**
 * Error thrown when a subagent bails (early termination)
 * This is not a real error - it's used to signal that execution should stop
 * and the subagent's result should be used as the final output.
 */
export class BailError extends Error {
  name: "BailError";

  /** The name of the subagent that bailed */
  readonly agentName: string;

  /** The response from the bailed subagent */
  readonly response: string;

  constructor(agentName: string, response: string) {
    super(`Subagent '${agentName}' bailed - early termination`);
    this.name = "BailError";
    this.agentName = agentName;
    this.response = response;
  }
}
