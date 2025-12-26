// Shared types for tool manager module

/**
 * Status of a tool at any given time
 */
export type ToolStatus = "idle" | "working" | "error" | "completed";

/**
 * Tool status information
 */
export type ToolStatusInfo = {
  name: string;
  status: ToolStatus;
  result?: any;
  error?: any;
  input?: any;
  output?: any;
  timestamp: Date;
  parameters?: any; // Tool parameter schema
};

// Re-exports for public API
export { BaseToolManager, isProviderTool } from "./BaseToolManager";
export { ToolManager } from "./ToolManager";
export { ToolkitManager } from "./ToolkitManager";
