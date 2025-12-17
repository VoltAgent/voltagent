export type {
  MCPAuthorizationAction,
  MCPAuthorizationContext,
  MCPAuthorizationConfig,
  MCPCanParams,
  MCPCanResult,
  MCPCanFunction,
} from "./types";

/**
 * Error thrown when MCP tool authorization is denied.
 */
export class MCPAuthorizationError extends Error {
  public readonly toolName: string;
  public readonly serverName: string;
  public readonly reason?: string;

  constructor(toolName: string, serverName: string, reason?: string) {
    super(
      `Authorization denied for tool '${toolName}' on server '${serverName}'${
        reason ? `: ${reason}` : ""
      }`,
    );
    this.name = "MCPAuthorizationError";
    this.toolName = toolName;
    this.serverName = serverName;
    this.reason = reason;
  }
}
