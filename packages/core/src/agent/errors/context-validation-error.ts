import { ClientHTTPError } from "./client-http-errors";

/** Invalid merged context, rejected before the agent's execution lifecycle starts. */
export class AgentContextValidationError extends ClientHTTPError {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super("AgentContextValidationError", 400, "INVALID_CONTEXT", "Invalid agent context");
    this.cause = cause;
    let current = cause;
    const seen = new Set<unknown>();
    while (current && typeof current === "object" && !seen.has(current)) {
      seen.add(current);
      if ("issues" in current && Array.isArray(current.issues)) {
        const details = current.issues.map((issue) => {
          const path = Array.isArray(issue.path) ? issue.path.join(".") : "context";
          return `${path || "context"}: ${issue.message}`;
        });
        this.message = `Invalid agent context: ${details.join("; ")}`;
        break;
      }
      current = "cause" in current ? current.cause : undefined;
    }
  }
}
