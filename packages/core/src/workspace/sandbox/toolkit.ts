import type { Span } from "@opentelemetry/api";
import { z } from "zod";
import type { Agent } from "../../agent/agent";
import type { OperationContext } from "../../agent/types";
import { createTool } from "../../tool";
import { createToolkit } from "../../tool/toolkit";
import type { Toolkit } from "../../tool/toolkit";
import { randomUUID } from "../../utils/id";
import type { WorkspaceFilesystem } from "../filesystem";
import { sanitizeToolCallId } from "../filesystem/utils";
import { withOperationTimeout } from "../timeout";
import type {
  WorkspaceToolPolicies,
  WorkspaceToolPolicy,
  WorkspaceToolPolicyGroup,
} from "../tool-policy";
import type { WorkspaceIdentity } from "../types";
import type { WorkspaceSandbox, WorkspaceSandboxResult } from "./types";

const WORKSPACE_SANDBOX_SYSTEM_PROMPT = `You can execute shell commands in the workspace sandbox.

- execute_command: run a shell command with optional args, cwd, env, and timeout`;

const EXECUTE_COMMAND_TOOL_DESCRIPTION =
  "Execute a shell command in the workspace sandbox with optional args, cwd, env, and timeout.";
const WORKSPACE_SANDBOX_TAGS = ["workspace", "sandbox"] as const;

export type WorkspaceSandboxToolkitOptions = {
  systemPrompt?: string | null;
  operationTimeoutMs?: number;
  customToolDescription?: string | null;
  outputEvictionBytes?: number;
  outputEvictionPath?: string;
  toolPolicies?: WorkspaceToolPolicies<WorkspaceSandboxToolName> | null;
};

export type WorkspaceSandboxToolkitContext = {
  sandbox?: WorkspaceSandbox;
  workspace?: WorkspaceIdentity;
  agent?: Agent;
  filesystem?: WorkspaceFilesystem;
};

export type WorkspaceSandboxToolName = "execute_command";

const setWorkspaceSpanAttributes = (
  operationContext: OperationContext,
  attributes: Record<string, unknown>,
): void => {
  const toolSpan = operationContext.systemContext.get("parentToolSpan") as Span | undefined;
  if (!toolSpan) {
    return;
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      toolSpan.setAttribute(key, value as never);
    }
  }
};

const buildWorkspaceAttributes = (workspace?: WorkspaceIdentity): Record<string, unknown> => ({
  "workspace.id": workspace?.id,
  "workspace.name": workspace?.name,
  "workspace.scope": workspace?.scope,
});

const formatSandboxHeader = (result: WorkspaceSandboxResult): string[] => {
  const lines: string[] = [];
  const exitCodeLabel = result.exitCode === null ? "unknown" : String(result.exitCode);

  lines.push(`Exit code: ${exitCodeLabel}`);
  lines.push(`Duration: ${result.durationMs} ms`);

  if (result.signal) {
    lines.push(`Signal: ${result.signal}`);
  }
  if (result.timedOut) {
    lines.push("Timed out: true");
  }
  if (result.aborted) {
    lines.push("Aborted: true");
  }
  if (result.stdoutTruncated) {
    lines.push("Stdout truncated: true");
  }
  if (result.stderrTruncated) {
    lines.push("Stderr truncated: true");
  }

  return lines;
};

type StreamEvictionResult = {
  content: string;
  bytes: number;
  truncated: boolean;
  evicted: boolean;
  path?: string;
  error?: string;
};

const DEFAULT_EVICTION_BYTES = 20000 * 4;
const DEFAULT_EVICTION_PATH = "/sandbox_results";
const TRUNCATION_SUFFIX = "\n... [output truncated]";

const normalizeEvictionPath = (value?: string): string => {
  const trimmed = value?.trim();
  const base = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_EVICTION_PATH;
  const withSlash = base.startsWith("/") ? base : `/${base}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
};

const truncateByBytes = (value: string, maxBytes: number): string => {
  if (maxBytes <= 0) {
    return "";
  }
  const size = Buffer.byteLength(value, "utf-8");
  if (size <= maxBytes) {
    return value;
  }
  const suffixBytes = Buffer.byteLength(TRUNCATION_SUFFIX, "utf-8");
  const targetBytes = Math.max(0, maxBytes - suffixBytes);
  const buf = Buffer.from(value, "utf-8");
  const truncated = buf.subarray(0, targetBytes).toString("utf-8");
  return `${truncated}${TRUNCATION_SUFFIX}`;
};

const formatStreamOutput = (label: string, info: StreamEvictionResult): string[] => {
  const lines: string[] = [];
  if (info.evicted && info.path) {
    const note = info.truncated ? " (truncated)" : "";
    lines.push(`${label}: saved to ${info.path} (${info.bytes} bytes${note})`);
    if (info.error) {
      lines.push(`${label} eviction error: ${info.error}`);
    }
    return lines;
  }

  if (info.content) {
    lines.push(`${label}:`);
    lines.push(info.content);
    return lines;
  }

  lines.push(`${label}: (empty)`);
  return lines;
};

export const createWorkspaceSandboxToolkit = (
  context: WorkspaceSandboxToolkitContext,
  options: WorkspaceSandboxToolkitOptions = {},
): Toolkit => {
  const systemPrompt =
    options.systemPrompt === undefined ? WORKSPACE_SANDBOX_SYSTEM_PROMPT : options.systemPrompt;
  const evictionBytes =
    options.outputEvictionBytes === undefined
      ? DEFAULT_EVICTION_BYTES
      : Math.max(0, options.outputEvictionBytes);
  const evictionBasePath = normalizeEvictionPath(options.outputEvictionPath);

  const isToolPolicyGroup = (
    policies: WorkspaceToolPolicies<WorkspaceSandboxToolName, WorkspaceToolPolicy>,
  ): policies is WorkspaceToolPolicyGroup<WorkspaceSandboxToolName, WorkspaceToolPolicy> =>
    Object.prototype.hasOwnProperty.call(policies, "tools") ||
    Object.prototype.hasOwnProperty.call(policies, "defaults");

  const resolveToolPolicy = (name: WorkspaceSandboxToolName) => {
    const toolPolicies = options.toolPolicies;
    if (!toolPolicies) {
      return undefined;
    }
    if (isToolPolicyGroup(toolPolicies)) {
      const defaults = toolPolicies.defaults ?? {};
      const override = toolPolicies.tools?.[name] ?? {};
      const merged = { ...defaults, ...override };
      return Object.keys(merged).length > 0 ? merged : undefined;
    }
    return toolPolicies[name];
  };

  const isToolEnabled = (name: WorkspaceSandboxToolName) =>
    resolveToolPolicy(name)?.enabled ?? true;

  const executeTool = createTool({
    name: "execute_command",
    description: options.customToolDescription || EXECUTE_COMMAND_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_SANDBOX_TAGS],
    needsApproval: resolveToolPolicy("execute_command")?.needsApproval,
    parameters: z.object({
      command: z.string().describe("Command to execute"),
      args: z.array(z.string()).optional().describe("Command arguments"),
      cwd: z.string().optional().describe("Working directory for the command"),
      timeout_ms: z.coerce.number().optional().describe("Timeout in milliseconds"),
      env: z.record(z.string(), z.string()).optional().describe("Environment variables to set"),
      stdin: z.string().optional().describe("Optional stdin input for the command"),
      max_output_bytes: z.coerce
        .number()
        .optional()
        .describe("Maximum output bytes to capture per stream (stdout or stderr)"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "sandbox.execute",
            "workspace.sandbox.command": input.command,
            "workspace.sandbox.args": input.args,
            "workspace.sandbox.cwd": input.cwd,
            "workspace.sandbox.timeout_ms": input.timeout_ms,
          });

          if (!context.sandbox) {
            return "Workspace sandbox is not configured.";
          }

          try {
            const result = await context.sandbox.execute({
              command: input.command,
              args: input.args,
              cwd: input.cwd,
              env: input.env,
              timeoutMs: input.timeout_ms,
              maxOutputBytes: input.max_output_bytes,
              stdin: input.stdin,
              signal: operationContext.abortController?.signal,
              operationContext,
            });

            setWorkspaceSpanAttributes(operationContext, {
              "workspace.sandbox.exit_code": result.exitCode ?? undefined,
            });

            const callId = executeOptions?.toolContext?.callId || randomUUID();
            const safeCallId = sanitizeToolCallId(callId);

            const evictStream = async (
              stream: "stdout" | "stderr",
              content: string,
              truncated: boolean,
            ): Promise<StreamEvictionResult> => {
              const bytes = Buffer.byteLength(content, "utf-8");
              const shouldEvict =
                content.length > 0 &&
                evictionBytes > 0 &&
                (bytes > evictionBytes || truncated) &&
                Boolean(context.filesystem);

              if (!shouldEvict) {
                const safeContent =
                  evictionBytes > 0 && bytes > evictionBytes
                    ? truncateByBytes(content, evictionBytes)
                    : content;
                return {
                  content: safeContent,
                  bytes,
                  truncated,
                  evicted: false,
                };
              }

              const filePath = `${evictionBasePath}/${safeCallId}.${stream}.txt`;
              const filesystem = context.filesystem;
              if (!filesystem) {
                const safeContent = truncateByBytes(content, evictionBytes);
                return {
                  content: safeContent,
                  bytes,
                  truncated,
                  evicted: false,
                  path: filePath,
                  error: "Workspace filesystem is not configured.",
                };
              }

              const writeResult = await filesystem.write(filePath, content, {
                context: { agent: context.agent, operationContext },
              });

              if (writeResult.error) {
                const safeContent = truncateByBytes(content, evictionBytes);
                return {
                  content: safeContent,
                  bytes,
                  truncated,
                  evicted: false,
                  path: filePath,
                  error: writeResult.error,
                };
              }

              return {
                content: "",
                bytes,
                truncated,
                evicted: true,
                path: filePath,
              };
            };

            const stdoutInfo = await evictStream("stdout", result.stdout, result.stdoutTruncated);
            const stderrInfo = await evictStream("stderr", result.stderr, result.stderrTruncated);

            const lines: string[] = [];
            lines.push(...formatSandboxHeader(result));
            lines.push(...formatStreamOutput("STDOUT", stdoutInfo));
            lines.push(...formatStreamOutput("STDERR", stderrInfo));

            return lines.join("\n");
          } catch (error: any) {
            const message = error?.message ? String(error.message) : "Unknown sandbox error";
            return `Error executing command: ${message}`;
          }
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const tools = isToolEnabled("execute_command") ? [executeTool] : [];

  return createToolkit({
    name: "workspace_sandbox",
    description: "Workspace sandbox tools",
    tools,
    instructions: systemPrompt || undefined,
    addInstructions: Boolean(systemPrompt),
  });
};
