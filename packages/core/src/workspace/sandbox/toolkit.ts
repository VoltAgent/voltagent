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
import type { WorkspaceIdentity, WorkspacePathContext } from "../types";
import { normalizeCommandAndArgs } from "./command-normalization";
import type { WorkspaceSandbox, WorkspaceSandboxResult } from "./types";

const WORKSPACE_SANDBOX_SYSTEM_PROMPT_BASE = `You can execute shell commands in the workspace sandbox.

- execute_command: run a shell command with optional args, cwd, env, and timeout
- Prefer executable in command and parameters in args
- Full command lines in command are accepted as fallback and tokenized automatically
- Use workspace paths and sandbox working directory information below when deciding cwd and file targets`;

const EXECUTE_COMMAND_TOOL_DESCRIPTION_BASE = `Execute a shell command in the workspace sandbox.

Usage:
- Prefer command + args (for example: command="npm", args=["test"]).
- Full command lines are allowed in command and will be tokenized as fallback.
- Set cwd explicitly for project-specific commands.
- Use timeout_ms for long-running commands.
- Always verify paths and quote arguments that include spaces.`;
const WORKSPACE_SANDBOX_TAGS = ["workspace", "sandbox"] as const;

const EXECUTE_COMMAND_OUTPUT_SCHEMA = z.object({
  success: z
    .boolean()
    .describe(
      "Whether command execution completed successfully (exit code 0 and not aborted/timed out)",
    ),
  exit_code: z.number().nullable().describe("Process exit code (null when process did not start)"),
  duration_ms: z.number().describe("Execution duration in milliseconds"),
  signal: z.string().optional().describe("Signal name if the process was terminated by a signal"),
  timed_out: z.boolean().describe("Whether the command timed out"),
  aborted: z.boolean().describe("Whether execution was aborted"),
  stdout: z
    .string()
    .describe("Captured stdout (may be empty when evicted to workspace files due to size limits)"),
  stderr: z
    .string()
    .describe("Captured stderr (may be empty when evicted to workspace files due to size limits)"),
  stdout_truncated: z.boolean().describe("Whether stdout was truncated in sandbox capture"),
  stderr_truncated: z.boolean().describe("Whether stderr was truncated in sandbox capture"),
  stdout_evicted_path: z
    .string()
    .optional()
    .describe("Workspace file path where stdout was stored when evicted"),
  stderr_evicted_path: z
    .string()
    .optional()
    .describe("Workspace file path where stderr was stored when evicted"),
  summary: z.string().describe("Human-readable execution summary"),
  error: z
    .string()
    .optional()
    .describe("Error message if command execution failed before process output"),
});

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
  pathContext?: WorkspacePathContext;
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

type WorkspaceWithPathContext = WorkspaceIdentity & {
  getPathContext?: () => WorkspacePathContext;
};

const normalizeInlineText = (value: string): string => value.replace(/\s+/g, " ").trim();

const resolvePathContext = (
  context: WorkspaceSandboxToolkitContext,
): WorkspacePathContext | null => {
  if (context.pathContext) {
    return context.pathContext;
  }

  const workspaceWithPathContext = context.workspace as WorkspaceWithPathContext | undefined;
  if (!workspaceWithPathContext?.getPathContext) {
    return null;
  }

  try {
    return workspaceWithPathContext.getPathContext() ?? null;
  } catch {
    return null;
  }
};

const buildPathContextLines = (pathContext: WorkspacePathContext | null): string[] => {
  if (!pathContext) {
    return [];
  }

  const lines: string[] = [];
  const filesystemInstructions = pathContext.filesystem?.instructions
    ? normalizeInlineText(pathContext.filesystem.instructions)
    : null;
  const sandboxInstructions = pathContext.sandbox?.instructions
    ? normalizeInlineText(pathContext.sandbox.instructions)
    : null;

  if (filesystemInstructions) {
    lines.push(`Filesystem: ${filesystemInstructions}`);
  }
  if (sandboxInstructions) {
    lines.push(`Sandbox: ${sandboxInstructions}`);
  }

  return lines;
};

const buildSystemPrompt = (pathContext: WorkspacePathContext | null): string => {
  const pathLines = buildPathContextLines(pathContext);
  if (pathLines.length === 0) {
    return WORKSPACE_SANDBOX_SYSTEM_PROMPT_BASE;
  }

  return `${WORKSPACE_SANDBOX_SYSTEM_PROMPT_BASE}\n\nPath context:\n${pathLines
    .map((line) => `- ${line}`)
    .join("\n")}`;
};

const buildExecuteCommandDescription = (pathContext: WorkspacePathContext | null): string => {
  const pathLines = buildPathContextLines(pathContext);
  if (pathLines.length === 0) {
    return EXECUTE_COMMAND_TOOL_DESCRIPTION_BASE;
  }

  return `${EXECUTE_COMMAND_TOOL_DESCRIPTION_BASE}\n\nPath context:\n${pathLines
    .map((line) => `- ${line}`)
    .join("\n")}`;
};

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
  const pathContext = resolvePathContext(context);
  const systemPrompt =
    options.systemPrompt === undefined ? buildSystemPrompt(pathContext) : options.systemPrompt;
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
    description: options.customToolDescription || buildExecuteCommandDescription(pathContext),
    tags: [...WORKSPACE_SANDBOX_TAGS],
    needsApproval: resolveToolPolicy("execute_command")?.needsApproval,
    parameters: z.object({
      command: z.string().describe("Command to execute"),
      args: z.array(z.string()).optional().describe("Command arguments"),
      cwd: z.string().optional().describe("Working directory for the command"),
      timeout_ms: z.coerce.number().optional().describe("Timeout in milliseconds"),
      env: z.record(z.string()).optional().describe("Environment variables to set"),
      stdin: z.string().optional().describe("Optional stdin input for the command"),
      max_output_bytes: z.coerce
        .number()
        .optional()
        .describe("Maximum output bytes to capture per stream (stdout or stderr)"),
    }),
    outputSchema: EXECUTE_COMMAND_OUTPUT_SCHEMA,
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const startedAt = Date.now();
          const normalized = normalizeCommandAndArgs(input.command, input.args);
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "sandbox.execute",
            "workspace.sandbox.command": normalized.command,
            "workspace.sandbox.args": normalized.args,
            "workspace.sandbox.cwd": input.cwd,
            "workspace.sandbox.timeout_ms": input.timeout_ms,
          });

          if (!context.sandbox) {
            return {
              success: false,
              exit_code: null,
              duration_ms: Date.now() - startedAt,
              timed_out: false,
              aborted: false,
              stdout: "",
              stderr: "",
              stdout_truncated: false,
              stderr_truncated: false,
              summary: "Workspace sandbox is not configured.",
              error: "Workspace sandbox is not configured.",
            };
          }

          try {
            const result = await context.sandbox.execute({
              command: normalized.command,
              args: normalized.args,
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
              const wasShortened = truncated || (evictionBytes > 0 && bytes > evictionBytes);
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
                  truncated: wasShortened,
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
                  truncated: wasShortened,
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
                  truncated: wasShortened,
                  evicted: false,
                  path: filePath,
                  error: writeResult.error,
                };
              }

              return {
                content: "",
                bytes,
                truncated: wasShortened,
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

            const summary = lines.join("\n");
            const streamErrors = [stdoutInfo.error, stderrInfo.error].filter(
              (value): value is string => Boolean(value),
            );

            return {
              success: !result.timedOut && !result.aborted && result.exitCode === 0,
              exit_code: result.exitCode,
              duration_ms: result.durationMs,
              signal: result.signal,
              timed_out: result.timedOut,
              aborted: result.aborted,
              stdout: stdoutInfo.content,
              stderr: stderrInfo.content,
              stdout_truncated: stdoutInfo.truncated,
              stderr_truncated: stderrInfo.truncated,
              stdout_evicted_path: stdoutInfo.evicted ? stdoutInfo.path : undefined,
              stderr_evicted_path: stderrInfo.evicted ? stderrInfo.path : undefined,
              summary,
              error: streamErrors.length > 0 ? streamErrors.join("; ") : undefined,
            };
          } catch (error: any) {
            const message = error?.message ? String(error.message) : "Unknown sandbox error";
            return {
              success: false,
              exit_code: null,
              duration_ms: Date.now() - startedAt,
              timed_out: false,
              aborted: false,
              stdout: "",
              stderr: "",
              stdout_truncated: false,
              stderr_truncated: false,
              summary: `Error executing command: ${message}`,
              error: message,
            };
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
