import { z } from "zod";
import type { Agent } from "../../agent/agent";
import type { OperationContext } from "../../agent/types";
import type { Tool } from "../../tool";
import { createTool } from "../../tool";
import { createToolkit } from "../../tool/toolkit";
import type { Toolkit } from "../../tool/toolkit";
import { randomUUID } from "../../utils/id";
import { loadPlanAgentState, updatePlanAgentState } from "../state";
import type { PlanAgentFileData } from "../types";
import type {
  EditResult,
  FileData,
  FileInfo,
  FilesystemBackend,
  FilesystemBackendContext,
  FilesystemBackendFactory,
  GrepMatch,
  WriteResult,
} from "./backends/backend";
import { CompositeFilesystemBackend } from "./backends/composite";
import { NodeFilesystemBackend } from "./backends/filesystem";
import { InMemoryFilesystemBackend } from "./backends/in-memory";
import { formatGrepMatches, sanitizeToolCallId, truncateIfTooLong } from "./utils";

export { InMemoryFilesystemBackend, CompositeFilesystemBackend, NodeFilesystemBackend };
export type {
  FileData,
  FileInfo,
  GrepMatch,
  WriteResult,
  EditResult,
  FilesystemBackend,
  FilesystemBackendFactory,
  FilesystemBackendContext,
};

export const FILESYSTEM_SYSTEM_PROMPT = `You have access to a virtual filesystem. All file paths must start with a /.

- ls: list files in a directory (requires absolute path)
- read_file: read a file from the filesystem
- write_file: write to a file in the filesystem
- edit_file: edit a file in the filesystem
- glob: find files matching a pattern (e.g., "**/*.ts")
- grep: search for text within files`;

export const LS_TOOL_DESCRIPTION = "List files and directories in a directory";
export const READ_FILE_TOOL_DESCRIPTION = "Read the contents of a file";
export const WRITE_FILE_TOOL_DESCRIPTION =
  "Write content to a new file. Returns an error if the file already exists";
export const EDIT_FILE_TOOL_DESCRIPTION =
  "Edit a file by replacing a specific string with a new string";
export const GLOB_TOOL_DESCRIPTION =
  "Find files matching a glob pattern (e.g., '**/*.ts' for all TypeScript files)";
export const GREP_TOOL_DESCRIPTION =
  "Search for a regex pattern in files. Returns matching files and line numbers";

export type FilesystemToolkitOptions = {
  backend?: FilesystemBackend | FilesystemBackendFactory;
  systemPrompt?: string | null;
  customToolDescriptions?: Record<string, string> | null;
  toolTokenLimitBeforeEvict?: number | null;
};

type FilesUpdate = Record<string, PlanAgentFileData | null>;

function resolveBackend(
  backend: FilesystemBackend | FilesystemBackendFactory,
  context: FilesystemBackendContext,
): FilesystemBackend {
  if (typeof backend === "function") {
    return backend(context);
  }
  return backend;
}

function mergeFileUpdates(
  current: Record<string, PlanAgentFileData> | undefined,
  update: FilesUpdate,
): Record<string, PlanAgentFileData> {
  const result: Record<string, PlanAgentFileData> = { ...(current || {}) };
  for (const [key, value] of Object.entries(update)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function applyFilesUpdate(
  agent: Agent,
  operationContext: OperationContext,
  filesUpdate: Record<string, PlanAgentFileData> | null | undefined,
): Promise<void> {
  if (!filesUpdate) {
    return;
  }

  await updatePlanAgentState(agent, operationContext, (state) => ({
    ...state,
    files: mergeFileUpdates(state.files, filesUpdate),
  }));
}

function formatLsOutput(infos: FileInfo[]): string {
  if (infos.length === 0) {
    return "No files found";
  }

  const lines: string[] = [];
  for (const info of infos) {
    if (info.is_dir) {
      lines.push(`${info.path} (directory)`);
    } else {
      const size = info.size ? ` (${info.size} bytes)` : "";
      lines.push(`${info.path}${size}`);
    }
  }
  return lines.join("\n");
}

function formatGlobOutput(infos: FileInfo[], pattern: string): string {
  if (infos.length === 0) {
    return `No files found matching pattern '${pattern}'`;
  }
  return infos.map((info) => info.path).join("\n");
}

function formatGrepOutput(result: GrepMatch[] | string, pattern: string): string {
  if (typeof result === "string") {
    return result;
  }

  if (result.length === 0) {
    return `No matches found for pattern '${pattern}'`;
  }

  return formatGrepMatches(result, "content");
}

function createLsTool(
  agent: Agent,
  backend: FilesystemBackend | FilesystemBackendFactory,
  options: {
    customDescription: string | undefined;
  },
) {
  return createTool({
    name: "ls",
    description: options.customDescription || LS_TOOL_DESCRIPTION,
    parameters: z.object({
      path: z.string().optional().default("/").describe("Directory path to list (default: /)"),
    }),
    execute: async (input, executeOptions) => {
      const operationContext = executeOptions as OperationContext;
      const state = await loadPlanAgentState(agent, operationContext);
      const resolvedBackend = resolveBackend(backend, {
        agent,
        operationContext,
        state,
      });
      const infos = await resolvedBackend.lsInfo(input.path || "/");
      return formatLsOutput(infos);
    },
  });
}

function createReadFileTool(
  agent: Agent,
  backend: FilesystemBackend | FilesystemBackendFactory,
  options: { customDescription: string | undefined },
) {
  return createTool({
    name: "read_file",
    description: options.customDescription || READ_FILE_TOOL_DESCRIPTION,
    parameters: z.object({
      file_path: z.string().describe("Absolute path to the file to read"),
      offset: z
        .number({ coerce: true })
        .optional()
        .default(0)
        .describe("Line offset to start reading from (0-indexed)"),
      limit: z
        .number({ coerce: true })
        .optional()
        .default(2000)
        .describe("Maximum number of lines to read"),
    }),
    execute: async (input, executeOptions) => {
      const operationContext = executeOptions as OperationContext;
      const state = await loadPlanAgentState(agent, operationContext);
      const resolvedBackend = resolveBackend(backend, {
        agent,
        operationContext,
        state,
      });
      return await resolvedBackend.read(input.file_path, input.offset, input.limit);
    },
  });
}

function createWriteFileTool(
  agent: Agent,
  backend: FilesystemBackend | FilesystemBackendFactory,
  options: { customDescription: string | undefined },
) {
  return createTool({
    name: "write_file",
    description: options.customDescription || WRITE_FILE_TOOL_DESCRIPTION,
    parameters: z.object({
      file_path: z.string().describe("Absolute path to the file to write"),
      content: z.string().describe("Content to write to the file"),
    }),
    execute: async (input, executeOptions) => {
      const operationContext = executeOptions as OperationContext;
      const state = await loadPlanAgentState(agent, operationContext);
      const resolvedBackend = resolveBackend(backend, {
        agent,
        operationContext,
        state,
      });

      const result = await resolvedBackend.write(input.file_path, input.content);
      if (result.error) {
        return result.error;
      }

      await applyFilesUpdate(agent, operationContext, result.filesUpdate || undefined);
      return `Successfully wrote to '${input.file_path}'`;
    },
  });
}

function createEditFileTool(
  agent: Agent,
  backend: FilesystemBackend | FilesystemBackendFactory,
  options: { customDescription: string | undefined },
) {
  return createTool({
    name: "edit_file",
    description: options.customDescription || EDIT_FILE_TOOL_DESCRIPTION,
    parameters: z.object({
      file_path: z.string().describe("Absolute path to the file to edit"),
      old_string: z.string().describe("String to be replaced (must match exactly)"),
      new_string: z.string().describe("String to replace with"),
      replace_all: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to replace all occurrences"),
    }),
    execute: async (input, executeOptions) => {
      const operationContext = executeOptions as OperationContext;
      const state = await loadPlanAgentState(agent, operationContext);
      const resolvedBackend = resolveBackend(backend, {
        agent,
        operationContext,
        state,
      });

      const result = await resolvedBackend.edit(
        input.file_path,
        input.old_string,
        input.new_string,
        input.replace_all,
      );

      if (result.error) {
        return result.error;
      }

      await applyFilesUpdate(agent, operationContext, result.filesUpdate || undefined);
      return `Successfully replaced ${result.occurrences ?? 0} occurrence(s) in '${input.file_path}'`;
    },
  });
}

function createGlobTool(
  agent: Agent,
  backend: FilesystemBackend | FilesystemBackendFactory,
  options: { customDescription: string | undefined },
) {
  return createTool({
    name: "glob",
    description: options.customDescription || GLOB_TOOL_DESCRIPTION,
    parameters: z.object({
      pattern: z.string().describe("Glob pattern (e.g., '*.ts', '**/*.ts')"),
      path: z.string().optional().default("/").describe("Base path to search from (default: /)"),
    }),
    execute: async (input, executeOptions) => {
      const operationContext = executeOptions as OperationContext;
      const state = await loadPlanAgentState(agent, operationContext);
      const resolvedBackend = resolveBackend(backend, {
        agent,
        operationContext,
        state,
      });

      const infos = await resolvedBackend.globInfo(input.pattern, input.path);
      return formatGlobOutput(infos, input.pattern);
    },
  });
}

function createGrepTool(
  agent: Agent,
  backend: FilesystemBackend | FilesystemBackendFactory,
  options: { customDescription: string | undefined },
) {
  return createTool({
    name: "grep",
    description: options.customDescription || GREP_TOOL_DESCRIPTION,
    parameters: z.object({
      pattern: z.string().describe("Regex pattern to search for"),
      path: z.string().optional().default("/").describe("Base path to search from (default: /)"),
      glob: z
        .string()
        .optional()
        .nullable()
        .describe("Optional glob pattern to filter files (e.g., '*.ts')"),
    }),
    execute: async (input, executeOptions) => {
      const operationContext = executeOptions as OperationContext;
      const state = await loadPlanAgentState(agent, operationContext);
      const resolvedBackend = resolveBackend(backend, {
        agent,
        operationContext,
        state,
      });

      const result = await resolvedBackend.grepRaw(input.pattern, input.path, input.glob ?? null);
      return formatGrepOutput(result, input.pattern);
    },
  });
}

export function createFilesystemToolkit(
  agent: Agent,
  options: FilesystemToolkitOptions = {},
): Toolkit {
  const backend =
    options.backend ||
    ((context: FilesystemBackendContext) =>
      new InMemoryFilesystemBackend(context.state.files || {}));
  const systemPrompt =
    options.systemPrompt === undefined ? FILESYSTEM_SYSTEM_PROMPT : options.systemPrompt;

  const tools = [
    createLsTool(agent, backend, { customDescription: options.customToolDescriptions?.ls }),
    createReadFileTool(agent, backend, {
      customDescription: options.customToolDescriptions?.read_file,
    }),
    createWriteFileTool(agent, backend, {
      customDescription: options.customToolDescriptions?.write_file,
    }),
    createEditFileTool(agent, backend, {
      customDescription: options.customToolDescriptions?.edit_file,
    }),
    createGlobTool(agent, backend, { customDescription: options.customToolDescriptions?.glob }),
    createGrepTool(agent, backend, { customDescription: options.customToolDescriptions?.grep }),
  ];

  return createToolkit({
    name: "planagent_filesystem",
    description: "Filesystem tools for context storage",
    tools,
    instructions: systemPrompt || undefined,
    addInstructions: Boolean(systemPrompt),
  });
}

export function createToolResultEvictor(options: {
  agent: Agent;
  backend: FilesystemBackend | FilesystemBackendFactory;
  tokenLimit: number;
  excludeToolNames?: string[];
}): (tool: Tool<any, any>) => Tool<any, any> {
  const { agent, backend, tokenLimit, excludeToolNames = [] } = options;

  return (tool) => {
    if (!tool.execute || excludeToolNames.includes(tool.name)) {
      return tool;
    }

    return createTool({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      outputSchema: tool.outputSchema,
      tags: tool.tags,
      providerOptions: tool.providerOptions,
      toModelOutput: tool.toModelOutput,
      execute: async (args, executeOptions) => {
        const result = await tool.execute?.(args, executeOptions);
        if (typeof result !== "string") {
          return result;
        }

        if (result.length <= tokenLimit * 4) {
          return result;
        }

        const operationContext = executeOptions as OperationContext;
        const state = await loadPlanAgentState(agent, operationContext);
        const resolvedBackend = resolveBackend(backend, {
          agent,
          operationContext,
          state,
        });
        const callId = executeOptions?.toolContext?.callId || randomUUID();
        const evictPath = `/large_tool_results/${sanitizeToolCallId(callId)}`;
        const writeResult = await resolvedBackend.write(evictPath, result);

        if (writeResult.error) {
          return result;
        }

        await applyFilesUpdate(agent, operationContext, writeResult.filesUpdate || undefined);

        const approxTokens = Math.round(result.length / 4);
        return `Tool result too large (${approxTokens} tokens). Content saved to ${evictPath}`;
      },
    });
  };
}

export function truncateToolResult(output: string | string[]): string | string[] {
  return truncateIfTooLong(output);
}
