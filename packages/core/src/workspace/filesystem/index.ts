import type { Span } from "@opentelemetry/api";
import { z } from "zod";
import type { Agent } from "../../agent/agent";
import type { OperationContext } from "../../agent/types";
import { createTool } from "../../tool";
import { createToolkit } from "../../tool/toolkit";
import type { Toolkit } from "../../tool/toolkit";
import { withOperationTimeout } from "../timeout";
import type {
  WorkspaceFilesystemToolPolicy,
  WorkspaceToolPolicies,
  WorkspaceToolPolicyGroup,
} from "../tool-policy";
import type { WorkspaceComponentStatus, WorkspaceIdentity } from "../types";
import type {
  DeleteResult,
  EditResult,
  FileData,
  FileInfo,
  FilesystemBackend,
  FilesystemBackendContext,
  FilesystemBackendFactory,
  GrepMatch,
  MkdirResult,
  RmdirResult,
  WriteResult,
} from "./backends/backend";
import { CompositeFilesystemBackend } from "./backends/composite";
import { NodeFilesystemBackend } from "./backends/filesystem";
import { InMemoryFilesystemBackend } from "./backends/in-memory";
import { formatGrepMatches, truncateIfTooLong } from "./utils";

export type {
  DeleteOptions,
  DeleteResult,
  EditResult,
  FileData,
  FileInfo,
  FilesystemBackend,
  FilesystemBackendContext,
  FilesystemBackendFactory,
  GrepMatch,
  MkdirResult,
  RmdirResult,
  WriteOptions,
  WriteResult,
} from "./backends/backend";
export { InMemoryFilesystemBackend, CompositeFilesystemBackend, NodeFilesystemBackend };

const WORKSPACE_FILESYSTEM_SYSTEM_PROMPT = `You have access to a workspace filesystem. All file paths must start with a /.

- ls: list files in a directory (requires absolute path)
- read_file: read a file from the filesystem
- write_file: write to a file in the filesystem
- edit_file: edit a file in the filesystem
- delete_file: delete a file from the filesystem
- stat: get file or directory metadata
- mkdir: create a directory
- rmdir: remove a directory
- list_tree: list files and directories with depth control
- list_files: list files and directories with depth control (alias)
- glob: find files matching a pattern (e.g., "**/*.ts")
- grep: search for text within files`;

const LS_TOOL_DESCRIPTION = "List files and directories in a directory";
const READ_FILE_TOOL_DESCRIPTION = "Read the contents of a file";
const WRITE_FILE_TOOL_DESCRIPTION =
  "Write content to a file. Returns an error if the file already exists unless overwrite=true; can create parent directories";
const EDIT_FILE_TOOL_DESCRIPTION = "Edit a file by replacing a specific string with a new string";
const DELETE_FILE_TOOL_DESCRIPTION =
  "Delete a file from the filesystem. Use recursive=true to remove a directory";
const STAT_TOOL_DESCRIPTION = "Get file or directory metadata";
const MKDIR_TOOL_DESCRIPTION = "Create a directory in the filesystem";
const RMDIR_TOOL_DESCRIPTION = "Remove a directory from the filesystem";
const LIST_TREE_TOOL_DESCRIPTION =
  "List files and directories recursively with optional depth control";
const LIST_FILES_TOOL_DESCRIPTION =
  "List files and directories recursively with optional depth control";
const GLOB_TOOL_DESCRIPTION =
  "Find files matching a glob pattern (e.g., '**/*.ts' for all TypeScript files)";
const GREP_TOOL_DESCRIPTION =
  "Search for a regex pattern in files. Returns matching files and line numbers";
const WORKSPACE_FILESYSTEM_TAGS = ["workspace", "filesystem"] as const;
const WORKSPACE_FS_READ_PATHS_KEY = Symbol("workspace.fs.readPaths");
const READ_ONLY_BLOCKED_TOOLS = new Set<WorkspaceFilesystemToolName>([
  "write_file",
  "edit_file",
  "delete_file",
  "mkdir",
  "rmdir",
]);

export type WorkspaceFilesystemToolName =
  | "ls"
  | "read_file"
  | "write_file"
  | "edit_file"
  | "delete_file"
  | "stat"
  | "mkdir"
  | "rmdir"
  | "list_tree"
  | "list_files"
  | "glob"
  | "grep";

export type WorkspaceFilesystemToolkitOptions = {
  systemPrompt?: string | null;
  operationTimeoutMs?: number;
  customToolDescriptions?: Partial<Record<WorkspaceFilesystemToolName, string>> | null;
  toolPolicies?: WorkspaceToolPolicies<
    WorkspaceFilesystemToolName,
    WorkspaceFilesystemToolPolicy
  > | null;
};

export type WorkspaceFilesystemOptions = {
  backend?: FilesystemBackend | FilesystemBackendFactory;
  files?: Record<string, FileData>;
  directories?: string[];
  readOnly?: boolean;
};

export type WorkspaceFilesystemCallContext = {
  agent?: Agent;
  operationContext?: OperationContext;
};

export type WorkspaceFilesystemReadOptions = {
  offset?: number;
  limit?: number;
  context?: WorkspaceFilesystemCallContext;
};

export type WorkspaceFilesystemWriteOptions = {
  overwrite?: boolean;
  ensureDirs?: boolean;
  context?: WorkspaceFilesystemCallContext;
};

export type WorkspaceFilesystemSearchOptions = {
  path?: string;
  glob?: string | null;
  context?: WorkspaceFilesystemCallContext;
};

export type WorkspaceFilesystemOperationOptions = {
  context?: WorkspaceFilesystemCallContext;
};

export type WorkspaceFilesystemDeleteOptions = {
  recursive?: boolean;
  context?: WorkspaceFilesystemCallContext;
};

export type WorkspaceFilesystemRmdirOptions = {
  recursive?: boolean;
  context?: WorkspaceFilesystemCallContext;
};

export type WorkspaceFilesystemToolkitContext = {
  filesystem: WorkspaceFilesystem;
  workspace?: WorkspaceIdentity;
  agent?: Agent;
};

const resolveBackend = (
  backend: FilesystemBackend | FilesystemBackendFactory,
  context: FilesystemBackendContext,
): FilesystemBackend => {
  if (typeof backend === "function") {
    return backend(context);
  }
  return backend;
};

const applyFilesUpdate = (
  current: Record<string, FileData>,
  update?: Record<string, FileData | null> | null,
): Record<string, FileData> => {
  if (!update) {
    return current;
  }

  const result: Record<string, FileData> = { ...current };
  for (const [key, value] of Object.entries(update)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
};

export class WorkspaceFilesystem {
  private backend: FilesystemBackend | FilesystemBackendFactory;
  private files: Record<string, FileData>;
  private directories: Set<string>;
  readonly readOnly: boolean;
  status: WorkspaceComponentStatus = "idle";

  constructor(options: WorkspaceFilesystemOptions = {}) {
    this.backend =
      options.backend ||
      ((context: FilesystemBackendContext) =>
        new InMemoryFilesystemBackend(
          context.state.files || {},
          context.state.directories || new Set(),
        ));
    this.files = options.files ?? {};
    this.directories = new Set(
      (options.directories ?? []).map((dir) => this.normalizeDirectoryPath(dir)),
    );
    this.readOnly = options.readOnly ?? false;
  }

  private normalizeDirectoryPath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) {
      return "/";
    }
    const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
  }

  private buildBackendContext(context?: WorkspaceFilesystemCallContext): FilesystemBackendContext {
    return {
      agent: context?.agent,
      operationContext: context?.operationContext,
      state: {
        files: this.files,
        directories: this.directories,
      },
    };
  }

  private updateFiles(update?: Record<string, FileData | null> | null): void {
    this.files = applyFilesUpdate(this.files, update);
  }

  init(): void {
    if (this.status === "destroyed") {
      throw new Error("Workspace filesystem has been destroyed.");
    }
    this.status = "ready";
  }

  destroy(): void {
    this.status = "destroyed";
  }

  getInfo(): Record<string, unknown> {
    const backendName =
      typeof this.backend === "function"
        ? "factory"
        : (this.backend?.constructor?.name ?? "unknown");
    return {
      backend: backendName,
      readOnly: this.readOnly,
      fileCount: Object.keys(this.files).length,
      directoryCount: this.directories.size,
    };
  }

  getInstructions(): string {
    return WORKSPACE_FILESYSTEM_SYSTEM_PROMPT;
  }

  async lsInfo(path = "/", options?: WorkspaceFilesystemOperationOptions): Promise<FileInfo[]> {
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    return await backend.lsInfo(path);
  }

  async read(filePath: string, options?: WorkspaceFilesystemReadOptions): Promise<string> {
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    return await backend.read(filePath, options?.offset ?? 0, options?.limit ?? 2000);
  }

  async readRaw(
    filePath: string,
    options?: WorkspaceFilesystemOperationOptions,
  ): Promise<FileData> {
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    return await backend.readRaw(filePath);
  }

  async write(
    filePath: string,
    content: string,
    options?: WorkspaceFilesystemWriteOptions,
  ): Promise<WriteResult> {
    if (this.readOnly) {
      return { error: "Workspace filesystem is read-only." };
    }
    if (options?.ensureDirs) {
      const normalized = filePath.replace(/\\/g, "/");
      const lastSlash = normalized.lastIndexOf("/");
      const parent = lastSlash <= 0 ? "/" : normalized.slice(0, lastSlash) || "/";
      await this.mkdir(parent, true, { context: options.context });
    }
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    const result = await backend.write(filePath, content, { overwrite: options?.overwrite });
    if (!result.error) {
      this.updateFiles(result.filesUpdate ?? undefined);
    }
    return result;
  }

  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll = false,
    options?: WorkspaceFilesystemOperationOptions,
  ): Promise<EditResult> {
    if (this.readOnly) {
      return { error: "Workspace filesystem is read-only." };
    }
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    const result = await backend.edit(filePath, oldString, newString, replaceAll);
    if (!result.error) {
      this.updateFiles(result.filesUpdate ?? undefined);
    }
    return result;
  }

  async delete(
    filePath: string,
    options?: WorkspaceFilesystemDeleteOptions,
  ): Promise<DeleteResult> {
    if (this.readOnly) {
      return { error: "Workspace filesystem is read-only." };
    }
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    if (!backend.delete) {
      return { error: "Delete operation is not supported by the configured filesystem backend." };
    }
    const result = await backend.delete(filePath, { recursive: options?.recursive });
    if (!result.error) {
      this.updateFiles(result.filesUpdate ?? undefined);
    }
    return result;
  }

  async globInfo(
    pattern: string,
    path = "/",
    options?: WorkspaceFilesystemOperationOptions,
  ): Promise<FileInfo[]> {
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    return await backend.globInfo(pattern, path);
  }

  async stat(
    filePath: string,
    options?: WorkspaceFilesystemOperationOptions,
  ): Promise<FileInfo | null> {
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    if (!backend.stat) {
      return null;
    }
    return await backend.stat(filePath);
  }

  async exists(filePath: string, options?: WorkspaceFilesystemOperationOptions): Promise<boolean> {
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    if (backend.exists) {
      return await backend.exists(filePath);
    }
    if (backend.stat) {
      const info = await backend.stat(filePath);
      return Boolean(info);
    }
    try {
      await backend.readRaw(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(
    path: string,
    recursive = true,
    options?: WorkspaceFilesystemOperationOptions,
  ): Promise<MkdirResult> {
    if (this.readOnly) {
      return { error: "Workspace filesystem is read-only." };
    }
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    if (!backend.mkdir) {
      return { error: "Mkdir operation is not supported by the configured filesystem backend." };
    }
    return await backend.mkdir(path, recursive);
  }

  async rmdir(
    path: string,
    recursive = false,
    options?: WorkspaceFilesystemRmdirOptions,
  ): Promise<RmdirResult> {
    if (this.readOnly) {
      return { error: "Workspace filesystem is read-only." };
    }
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    if (!backend.rmdir) {
      return { error: "Rmdir operation is not supported by the configured filesystem backend." };
    }
    const result = await backend.rmdir(path, recursive);
    if (!result.error) {
      this.updateFiles(result.filesUpdate ?? undefined);
    }
    return result;
  }

  async grepRaw(
    pattern: string,
    options?: WorkspaceFilesystemSearchOptions,
  ): Promise<GrepMatch[] | string> {
    const backend = resolveBackend(this.backend, this.buildBackendContext(options?.context));
    return await backend.grepRaw(pattern, options?.path, options?.glob ?? null);
  }
}

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

const formatLsOutput = (infos: FileInfo[]): string => {
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
};

const formatGlobOutput = (infos: FileInfo[], pattern: string): string => {
  if (infos.length === 0) {
    return `No files found matching pattern '${pattern}'`;
  }
  return infos.map((info) => info.path).join("\n");
};

const formatGrepOutput = (result: GrepMatch[] | string, pattern: string): string => {
  if (typeof result === "string") {
    return result;
  }

  if (result.length === 0) {
    return `No matches found for pattern '${pattern}'`;
  }

  return formatGrepMatches(result, "content");
};

const formatStatOutput = (info: FileInfo | null, inputPath: string): string => {
  if (!info) {
    return `No file or directory found at '${inputPath}'`;
  }

  const lines = [`path: ${info.path}`, `type: ${info.is_dir ? "directory" : "file"}`];

  if (!info.is_dir && info.size !== undefined) {
    lines.push(`size: ${info.size} bytes`);
  }

  if (info.created_at) {
    lines.push(`created_at: ${info.created_at}`);
  }

  if (info.modified_at) {
    lines.push(`modified_at: ${info.modified_at}`);
  }

  return lines.join("\n");
};

const normalizeTrackedPath = (path: string): string => {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

type ReadPathRecord = {
  modifiedAt?: string | null;
};

const getReadPaths = (operationContext: OperationContext): Map<string, ReadPathRecord> => {
  let readPaths = operationContext.systemContext.get(WORKSPACE_FS_READ_PATHS_KEY) as
    | Map<string, ReadPathRecord>
    | undefined;
  if (!readPaths) {
    readPaths = new Map<string, ReadPathRecord>();
    operationContext.systemContext.set(WORKSPACE_FS_READ_PATHS_KEY, readPaths);
  }
  return readPaths;
};

const recordReadPath = (
  operationContext: OperationContext,
  filePath: string,
  modifiedAt?: string | null,
): void => {
  const readPaths = getReadPaths(operationContext);
  readPaths.set(normalizeTrackedPath(filePath), { modifiedAt: modifiedAt ?? null });
};

const enforceReadBeforeWrite = async (
  operationContext: OperationContext,
  filesystem: WorkspaceFilesystem,
  filePath: string,
  requireReadBeforeWrite?: boolean,
  context?: WorkspaceFilesystemCallContext,
): Promise<string | null> => {
  if (!requireReadBeforeWrite) {
    return null;
  }

  const normalized = normalizeTrackedPath(filePath);
  const info = await filesystem.stat(normalized, { context });
  if (!info) {
    return null;
  }
  if (info.is_dir) {
    return null;
  }

  const readPaths = getReadPaths(operationContext);
  const record = readPaths.get(normalized);
  if (!record) {
    return `Error: Please read '${normalized}' with read_file before modifying it.`;
  }
  if (info.modified_at && record.modifiedAt && info.modified_at !== record.modifiedAt) {
    return `Error: '${normalized}' has changed since it was last read. Read it again before modifying.`;
  }

  return null;
};

type WorkspaceFilesystemToolCreateOptions = {
  customDescription?: string | undefined;
  needsApproval?: WorkspaceFilesystemToolPolicy["needsApproval"];
  operationTimeoutMs?: number;
};

type WorkspaceFilesystemWritePolicyOptions = WorkspaceFilesystemToolCreateOptions & {
  requireReadBeforeWrite?: boolean;
};

const createLsTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemToolCreateOptions,
) =>
  createTool({
    name: "ls",
    description: options.customDescription || LS_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      path: z.string().optional().default("/").describe("Directory path to list (default: /)"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.list",
            "workspace.fs.path": input.path || "/",
          });
          const infos = await context.filesystem.lsInfo(input.path || "/", {
            context: { agent: context.agent, operationContext },
          });
          return formatLsOutput(infos);
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createReadFileTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemToolCreateOptions,
) =>
  createTool({
    name: "read_file",
    description: options.customDescription || READ_FILE_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      file_path: z.string().describe("Absolute path to the file to read"),
      offset: z.coerce
        .number()
        .optional()
        .default(0)
        .describe("Line offset to start reading from (0-indexed)"),
      limit: z.coerce.number().optional().default(2000).describe("Maximum number of lines to read"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.read",
            "workspace.fs.path": input.file_path,
            "workspace.fs.offset": input.offset,
            "workspace.fs.limit": input.limit,
          });
          const statInfo = await context.filesystem.stat(input.file_path, {
            context: { agent: context.agent, operationContext },
          });
          const result = await context.filesystem.read(input.file_path, {
            offset: input.offset,
            limit: input.limit,
            context: { agent: context.agent, operationContext },
          });
          if (statInfo && !statInfo.is_dir) {
            recordReadPath(operationContext, input.file_path, statInfo.modified_at ?? null);
          }
          return result;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createWriteFileTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemWritePolicyOptions,
) =>
  createTool({
    name: "write_file",
    description: options.customDescription || WRITE_FILE_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      file_path: z.string().describe("Absolute path to the file to write"),
      content: z.string().describe("Content to write to the file"),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to overwrite the file if it already exists"),
      create_parent_dirs: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to create parent directories if needed"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          const guardError = await enforceReadBeforeWrite(
            operationContext,
            context.filesystem,
            input.file_path,
            options.requireReadBeforeWrite,
            { agent: context.agent, operationContext },
          );
          if (guardError) {
            return guardError;
          }
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.write",
            "workspace.fs.path": input.file_path,
            "workspace.fs.bytes": input.content.length,
          });
          const result = await context.filesystem.write(input.file_path, input.content, {
            overwrite: input.overwrite,
            ensureDirs: input.create_parent_dirs,
            context: { agent: context.agent, operationContext },
          });
          if (result.error) {
            return result.error;
          }
          return `Successfully wrote to '${input.file_path}'`;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createEditFileTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemWritePolicyOptions,
) =>
  createTool({
    name: "edit_file",
    description: options.customDescription || EDIT_FILE_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
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
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          const guardError = await enforceReadBeforeWrite(
            operationContext,
            context.filesystem,
            input.file_path,
            options.requireReadBeforeWrite,
            { agent: context.agent, operationContext },
          );
          if (guardError) {
            return guardError;
          }
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.edit",
            "workspace.fs.path": input.file_path,
          });
          const result = await context.filesystem.edit(
            input.file_path,
            input.old_string,
            input.new_string,
            input.replace_all,
            { context: { agent: context.agent, operationContext } },
          );
          if (result.error) {
            return result.error;
          }
          setWorkspaceSpanAttributes(operationContext, {
            "workspace.fs.occurrences": result.occurrences,
          });
          return `Successfully replaced ${result.occurrences ?? 0} occurrence(s) in '${input.file_path}'`;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createDeleteFileTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemWritePolicyOptions,
) =>
  createTool({
    name: "delete_file",
    description: options.customDescription || DELETE_FILE_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      file_path: z.string().describe("Absolute path to the file to delete"),
      recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to delete directories recursively"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          const guardError = await enforceReadBeforeWrite(
            operationContext,
            context.filesystem,
            input.file_path,
            options.requireReadBeforeWrite,
            { agent: context.agent, operationContext },
          );
          if (guardError) {
            return guardError;
          }
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.delete",
            "workspace.fs.path": input.file_path,
          });
          const result = await context.filesystem.delete(input.file_path, {
            recursive: input.recursive,
            context: { agent: context.agent, operationContext },
          });
          if (result.error) {
            return result.error;
          }
          return `Successfully deleted '${input.file_path}'`;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createGlobTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemToolCreateOptions,
) =>
  createTool({
    name: "glob",
    description: options.customDescription || GLOB_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      pattern: z.string().describe("Glob pattern (e.g., '*.ts', '**/*.ts')"),
      path: z.string().optional().default("/").describe("Base path to search from (default: /)"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.glob",
            "workspace.fs.path": input.path || "/",
            "workspace.fs.pattern": input.pattern,
          });
          const infos = await context.filesystem.globInfo(input.pattern, input.path, {
            context: { agent: context.agent, operationContext },
          });
          return formatGlobOutput(infos, input.pattern);
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createGrepTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemToolCreateOptions,
) =>
  createTool({
    name: "grep",
    description: options.customDescription || GREP_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      pattern: z.string().describe("Regex pattern to search for"),
      path: z.string().optional().default("/").describe("Base path to search from (default: /)"),
      glob: z
        .string()
        .optional()
        .nullable()
        .describe("Optional glob pattern to filter files (e.g., '*.ts')"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.grep",
            "workspace.fs.path": input.path || "/",
            "workspace.search.query": input.pattern,
            "workspace.fs.pattern": input.glob ?? undefined,
          });
          const result = await context.filesystem.grepRaw(input.pattern, {
            path: input.path || "/",
            glob: input.glob ?? null,
            context: { agent: context.agent, operationContext },
          });
          return formatGrepOutput(result, input.pattern);
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createStatTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemToolCreateOptions,
) =>
  createTool({
    name: "stat",
    description: options.customDescription || STAT_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      path: z.string().describe("Absolute path to the file or directory"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.stat",
            "workspace.fs.path": input.path,
          });
          const info = await context.filesystem.stat(input.path, {
            context: { agent: context.agent, operationContext },
          });
          return formatStatOutput(info, input.path);
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createMkdirTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemWritePolicyOptions,
) =>
  createTool({
    name: "mkdir",
    description: options.customDescription || MKDIR_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      path: z.string().describe("Absolute path to the directory to create"),
      recursive: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to create parent directories if needed (default: true)"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          const guardError = await enforceReadBeforeWrite(
            operationContext,
            context.filesystem,
            input.path,
            options.requireReadBeforeWrite,
            { agent: context.agent, operationContext },
          );
          if (guardError) {
            return guardError;
          }
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.mkdir",
            "workspace.fs.path": input.path,
          });
          const result = await context.filesystem.mkdir(input.path, input.recursive, {
            context: { agent: context.agent, operationContext },
          });
          if (result.error) {
            return result.error;
          }
          return `Successfully created directory '${result.path ?? input.path}'`;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createRmdirTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemWritePolicyOptions,
) =>
  createTool({
    name: "rmdir",
    description: options.customDescription || RMDIR_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      path: z.string().describe("Absolute path to the directory to remove"),
      recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to remove contents recursively"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          const guardError = await enforceReadBeforeWrite(
            operationContext,
            context.filesystem,
            input.path,
            options.requireReadBeforeWrite,
            { agent: context.agent, operationContext },
          );
          if (guardError) {
            return guardError;
          }
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.rmdir",
            "workspace.fs.path": input.path,
          });
          const result = await context.filesystem.rmdir(input.path, input.recursive, {
            context: { agent: context.agent, operationContext },
          });
          if (result.error) {
            return result.error;
          }
          return `Successfully removed directory '${result.path ?? input.path}'`;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

const createListTreeTool = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemToolCreateOptions,
  name: "list_tree" | "list_files",
  description: string,
) =>
  createTool({
    name,
    description: options.customDescription || description,
    tags: [...WORKSPACE_FILESYSTEM_TAGS],
    needsApproval: options.needsApproval,
    parameters: z.object({
      path: z.string().optional().default("/").describe("Base directory path (default: /)"),
      max_depth: z.coerce
        .number()
        .int()
        .min(1)
        .optional()
        .default(3)
        .describe("Maximum depth to traverse (default: 3)"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          const startPath = input.path || "/";
          const maxDepth = input.max_depth ?? 3;

          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "filesystem.list_tree",
            "workspace.fs.path": startPath,
            "workspace.fs.depth": maxDepth,
          });

          const lines: string[] = [];
          const visited = new Set<string>();

          const normalizeDirPath = (path: string) => (path.endsWith("/") ? path : `${path}/`);

          const walk = async (dirPath: string, depth: number) => {
            if (depth > maxDepth) {
              return;
            }

            const normalizedDir = normalizeDirPath(dirPath);
            if (visited.has(normalizedDir)) {
              return;
            }
            visited.add(normalizedDir);

            const infos = await context.filesystem.lsInfo(normalizedDir, {
              context: { agent: context.agent, operationContext },
            });

            if (infos.length === 0) {
              return;
            }

            const sorted = [...infos].sort((a, b) => {
              const aDir = Boolean(a.is_dir);
              const bDir = Boolean(b.is_dir);
              if (aDir !== bDir) {
                return aDir ? -1 : 1;
              }
              return a.path.localeCompare(b.path);
            });

            for (const info of sorted) {
              const relative = info.path.startsWith(normalizedDir)
                ? info.path.substring(normalizedDir.length)
                : info.path;
              const baseName = relative.replace(/\/$/, "");
              const displayName = baseName || relative || info.path;
              const indent = "  ".repeat(depth);
              lines.push(`${indent}- ${displayName}${info.is_dir ? "/" : ""}`);

              if (info.is_dir && depth < maxDepth) {
                await walk(info.path, depth + 1);
              }
            }
          };

          const statInfo = await context.filesystem.stat(startPath, {
            context: { agent: context.agent, operationContext },
          });

          if (statInfo && !statInfo.is_dir) {
            return statInfo.path;
          }

          const rootPath = statInfo?.is_dir
            ? statInfo.path
            : startPath.endsWith("/")
              ? startPath
              : `${startPath}/`;

          lines.push(rootPath);
          await walk(rootPath, 1);

          if (lines.length === 1) {
            return `${rootPath}\n  (empty)`;
          }

          const truncated = truncateIfTooLong(lines);
          const output = Array.isArray(truncated) ? truncated.join("\n") : truncated;
          return output;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

export const createWorkspaceFilesystemToolkit = (
  context: WorkspaceFilesystemToolkitContext,
  options: WorkspaceFilesystemToolkitOptions = {},
): Toolkit => {
  const systemPrompt =
    options.systemPrompt === undefined ? WORKSPACE_FILESYSTEM_SYSTEM_PROMPT : options.systemPrompt;

  const isToolPolicyGroup = (
    policies: WorkspaceToolPolicies<WorkspaceFilesystemToolName, WorkspaceFilesystemToolPolicy>,
  ): policies is WorkspaceToolPolicyGroup<
    WorkspaceFilesystemToolName,
    WorkspaceFilesystemToolPolicy
  > =>
    Object.prototype.hasOwnProperty.call(policies, "tools") ||
    Object.prototype.hasOwnProperty.call(policies, "defaults");

  const resolveToolPolicy = (
    name: WorkspaceFilesystemToolName,
  ): WorkspaceFilesystemToolPolicy | undefined => {
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

  const isToolEnabled = (name: WorkspaceFilesystemToolName) => {
    if (context.filesystem.readOnly && READ_ONLY_BLOCKED_TOOLS.has(name)) {
      return false;
    }
    const policy = resolveToolPolicy(name);
    return policy?.enabled ?? true;
  };

  const buildToolOptions = (name: WorkspaceFilesystemToolName) => {
    const policy = resolveToolPolicy(name);
    return {
      customDescription: options.customToolDescriptions?.[name],
      needsApproval: policy?.needsApproval,
      requireReadBeforeWrite: policy?.requireReadBeforeWrite,
      operationTimeoutMs: options.operationTimeoutMs,
    };
  };

  const tools: Toolkit["tools"] = [];
  if (isToolEnabled("ls")) {
    tools.push(createLsTool(context, buildToolOptions("ls")));
  }
  if (isToolEnabled("read_file")) {
    tools.push(createReadFileTool(context, buildToolOptions("read_file")));
  }
  if (isToolEnabled("write_file")) {
    tools.push(createWriteFileTool(context, buildToolOptions("write_file")));
  }
  if (isToolEnabled("edit_file")) {
    tools.push(createEditFileTool(context, buildToolOptions("edit_file")));
  }
  if (isToolEnabled("delete_file")) {
    tools.push(createDeleteFileTool(context, buildToolOptions("delete_file")));
  }
  if (isToolEnabled("stat")) {
    tools.push(createStatTool(context, buildToolOptions("stat")));
  }
  if (isToolEnabled("mkdir")) {
    tools.push(createMkdirTool(context, buildToolOptions("mkdir")));
  }
  if (isToolEnabled("rmdir")) {
    tools.push(createRmdirTool(context, buildToolOptions("rmdir")));
  }
  if (isToolEnabled("list_tree")) {
    tools.push(
      createListTreeTool(
        context,
        buildToolOptions("list_tree"),
        "list_tree",
        LIST_TREE_TOOL_DESCRIPTION,
      ),
    );
  }
  if (isToolEnabled("list_files")) {
    tools.push(
      createListTreeTool(
        context,
        buildToolOptions("list_files"),
        "list_files",
        LIST_FILES_TOOL_DESCRIPTION,
      ),
    );
  }
  if (isToolEnabled("glob")) {
    tools.push(createGlobTool(context, buildToolOptions("glob")));
  }
  if (isToolEnabled("grep")) {
    tools.push(createGrepTool(context, buildToolOptions("grep")));
  }

  return createToolkit({
    name: "workspace_filesystem",
    description: "Workspace filesystem tools",
    tools,
    instructions: systemPrompt || undefined,
    addInstructions: Boolean(systemPrompt),
  });
};
