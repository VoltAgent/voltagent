/**
 * The action being authorized.
 * - "discovery": Tool is being listed/discovered (getTools/getToolsets)
 * - "execution": Tool is being executed (callTool)
 */
export type MCPAuthorizationAction = "discovery" | "execution";

/**
 * Minimal context for tool discovery authorization.
 * Used when full OperationContext is not available (e.g., during getTools).
 */
export interface MCPAuthorizationContext {
  /** User identifier */
  userId?: string;
  /** User-defined context map (same as OperationContext.context) */
  context?: Map<string | symbol, unknown> | Record<string, unknown>;
}

/**
 * Parameters passed to the `can` authorization function.
 */
export interface MCPCanParams {
  /** Tool name (without server prefix) */
  toolName: string;
  /** Server/resource identifier */
  serverName: string;
  /** The action being authorized: "discovery" or "execution" */
  action: MCPAuthorizationAction;
  /** Tool arguments (for attribute-based access control) */
  arguments?: Record<string, unknown>;
  /** User identifier */
  userId?: string;
  /** User-defined context (from authContext or OperationContext) */
  context?: Map<string | symbol, unknown>;
}

/**
 * Result from the `can` authorization function.
 * Can be a simple boolean or an object with reason.
 */
export type MCPCanResult = boolean | { allowed: boolean; reason?: string };

/**
 * Simple authorization function type.
 * Return true/false or { allowed: boolean, reason?: string }
 *
 * @example
 * ```typescript
 * const can: MCPCanFunction = async ({ toolName, action, userId, context }) => {
 *   const roles = context?.get("roles") as string[] ?? [];
 *   // action is "discovery" or "execution"
 *   if (toolName === "delete_item" && !roles.includes("admin")) {
 *     return { allowed: false, reason: "Only admins can delete" };
 *   }
 *   return true;
 * };
 * ```
 */
export type MCPCanFunction = (params: MCPCanParams) => Promise<MCPCanResult> | MCPCanResult;

/**
 * Authorization configuration for MCPConfiguration.
 *
 * @example
 * ```typescript
 * const mcp = new MCPConfiguration({
 *   servers: { myServer: { type: "http", url: "..." } },
 *   authorization: {
 *     can: async ({ toolName, action, userId, context }) => {
 *       const roles = context?.get("roles") as string[] ?? [];
 *       // action is "discovery" or "execution"
 *       if (toolName === "admin_tool" && !roles.includes("admin")) {
 *         return { allowed: false, reason: "Admin only" };
 *       }
 *       return true;
 *     },
 *     filterOnDiscovery: true,
 *   },
 * });
 * ```
 */
export interface MCPAuthorizationConfig {
  /**
   * Authorization function to check if a tool can be accessed.
   * Called for both discovery and execution based on config options.
   */
  can: MCPCanFunction;

  /**
   * Whether to filter tools on discovery (getTools/getToolsets).
   * When true, unauthorized tools are hidden from the tool list.
   * @default false
   */
  filterOnDiscovery?: boolean;

  /**
   * Whether to check authorization on execution (callTool).
   * When true, each tool call is verified before execution.
   * @default true
   */
  checkOnExecution?: boolean;
}
