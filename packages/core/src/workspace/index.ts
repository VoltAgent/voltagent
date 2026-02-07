import { randomUUID } from "../utils/id";
import {
  type DeleteResult,
  type EditResult,
  type FileData,
  type FileInfo,
  type FilesystemBackend,
  type FilesystemBackendContext,
  type FilesystemBackendFactory,
  type GrepMatch,
  type MkdirResult,
  type RmdirResult,
  WorkspaceFilesystem,
  type WorkspaceFilesystemCallContext,
  type WorkspaceFilesystemDeleteOptions,
  type WorkspaceFilesystemOperationOptions,
  type WorkspaceFilesystemOptions,
  type WorkspaceFilesystemReadOptions,
  type WorkspaceFilesystemRmdirOptions,
  type WorkspaceFilesystemSearchOptions,
  type WorkspaceFilesystemToolName,
  type WorkspaceFilesystemToolkitOptions,
  type WorkspaceFilesystemWriteOptions,
  type WriteResult,
  createWorkspaceFilesystemToolkit,
} from "./filesystem";
import type {
  LocalSandboxIsolationOptions,
  LocalSandboxIsolationProvider,
  LocalSandboxOptions,
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
  WorkspaceSandboxStatus,
  WorkspaceSandboxToolName,
  WorkspaceSandboxToolkitContext,
  WorkspaceSandboxToolkitOptions,
} from "./sandbox";
import {
  LocalSandbox,
  createWorkspaceSandboxToolkit,
  detectLocalSandboxIsolation,
} from "./sandbox";
import {
  WorkspaceSearch,
  type WorkspaceSearchToolName,
  type WorkspaceSearchToolkitContext,
  type WorkspaceSearchToolkitOptions,
  createWorkspaceSearchToolkit,
} from "./search";
import type {
  WorkspaceSearchIndexSummary,
  WorkspaceSearchOptions,
  WorkspaceSearchResult,
} from "./search/types";
import {
  WorkspaceSkills,
  type WorkspaceSkillsPromptHookContext,
  type WorkspaceSkillsToolName,
  type WorkspaceSkillsToolkitContext,
  type WorkspaceSkillsToolkitOptions,
  createWorkspaceSkillsPromptHook,
  createWorkspaceSkillsToolkit,
} from "./skills";
import type { WorkspaceSkillsPromptOptions } from "./skills/types";
import { withOperationTimeout } from "./timeout";
import type {
  WorkspaceFilesystemToolPolicy,
  WorkspaceToolConfig,
  WorkspaceToolPolicies,
  WorkspaceToolPolicy,
  WorkspaceToolPolicyGroup,
} from "./tool-policy";
import type {
  WorkspaceConfig,
  WorkspaceFilesystemConfig,
  WorkspaceIdentity,
  WorkspaceInfo,
  WorkspacePathContext,
  WorkspaceScope,
  WorkspaceStatus,
} from "./types";

const isToolPolicyGroup = <TName extends string, TPolicy>(
  policies: WorkspaceToolPolicies<TName, TPolicy>,
): policies is WorkspaceToolPolicyGroup<TName, TPolicy> =>
  Object.prototype.hasOwnProperty.call(policies, "tools") ||
  Object.prototype.hasOwnProperty.call(policies, "defaults");

const normalizeToolPolicies = <TName extends string, TPolicy>(
  policies?: WorkspaceToolPolicies<TName, TPolicy> | null,
): { defaults?: TPolicy; tools?: Partial<Record<TName, TPolicy>> } | null => {
  if (!policies) {
    return null;
  }
  if (isToolPolicyGroup(policies)) {
    return {
      defaults: policies.defaults,
      tools: policies.tools,
    };
  }
  return { tools: policies };
};

const mergeToolPolicies = <TName extends string, TPolicy>(
  base?: WorkspaceToolPolicies<TName, TPolicy> | null,
  override?: WorkspaceToolPolicies<TName, TPolicy> | null,
): WorkspaceToolPolicies<TName, TPolicy> | undefined => {
  const baseNormalized = normalizeToolPolicies(base);
  const overrideNormalized = normalizeToolPolicies(override);
  if (!baseNormalized && !overrideNormalized) {
    return undefined;
  }
  return {
    defaults: {
      ...(baseNormalized?.defaults ?? {}),
      ...(overrideNormalized?.defaults ?? {}),
    } as TPolicy,
    tools: {
      ...(baseNormalized?.tools ?? {}),
      ...(overrideNormalized?.tools ?? {}),
    },
  };
};

export class Workspace {
  readonly id: string;
  readonly name?: string;
  readonly scope: WorkspaceScope;
  readonly filesystem: WorkspaceFilesystem;
  readonly sandbox?: WorkspaceSandbox;
  private readonly searchService?: WorkspaceSearch;
  private readonly allowDirectSearchAccess: boolean;
  private readonly operationTimeoutMs?: number;
  readonly skills?: WorkspaceSkills;
  private readonly toolConfig?: WorkspaceToolConfig;
  status: WorkspaceStatus = "idle";
  private initPromise?: Promise<void>;

  constructor(options: WorkspaceConfig = {}) {
    this.id = options.id ?? randomUUID();
    this.name = options.name;
    this.scope = options.scope ?? "agent";
    this.filesystem = new WorkspaceFilesystem(options.filesystem);
    this.sandbox = options.sandbox;
    this.operationTimeoutMs = options.operationTimeoutMs;
    this.allowDirectSearchAccess = options.search?.allowDirectAccess ?? false;
    this.searchService = options.search
      ? new WorkspaceSearch({ filesystem: this.filesystem, ...options.search })
      : undefined;
    this.skills = options.skills
      ? new WorkspaceSkills({
          filesystem: this.filesystem,
          workspace: { id: this.id, name: this.name, scope: this.scope },
          ...options.skills,
        })
      : undefined;
    this.toolConfig = options.toolConfig;
  }

  async init(): Promise<void> {
    if (this.isDestroyed()) {
      throw new Error("Workspace has been destroyed.");
    }
    if (this.status === "ready") {
      return;
    }
    if (!this.initPromise) {
      this.status = "initializing";
      this.initPromise = (async () => {
        try {
          if (this.isDestroyed()) {
            return;
          }
          this.filesystem.init();
          if (this.isDestroyed()) {
            return;
          }
          await this.sandbox?.start?.();
          if (this.isDestroyed()) {
            return;
          }
          await this.searchService?.init?.();
          if (this.isDestroyed()) {
            return;
          }
          await this.skills?.init?.();
          if (!this.isDestroyed()) {
            this.status = "ready";
          }
        } catch (error) {
          if (!this.isDestroyed()) {
            this.status = "error";
          }
          throw error;
        } finally {
          this.initPromise = undefined;
        }
      })();
    }
    await this.initPromise;
  }

  async destroy(): Promise<void> {
    if (this.isDestroyed()) {
      return;
    }
    this.status = "destroyed";
    if (this.initPromise) {
      await this.initPromise.catch(() => undefined);
    }
    await this.sandbox?.destroy?.();
    this.searchService?.destroy();
    this.skills?.destroy();
    this.filesystem.destroy();
  }

  private isDestroyed(): boolean {
    return this.status === "destroyed";
  }

  getInfo(): WorkspaceInfo {
    return {
      id: this.id,
      name: this.name,
      scope: this.scope,
      status: this.status,
      operationTimeoutMs: this.operationTimeoutMs,
      filesystem: {
        status: this.filesystem.status,
        details: this.filesystem.getInfo(),
      },
      sandbox: this.sandbox
        ? {
            status: this.sandbox.status,
            details: this.sandbox.getInfo?.(),
          }
        : undefined,
      search: this.searchService
        ? {
            status: this.searchService.status,
            details: this.searchService.getInfo(),
          }
        : undefined,
      skills: this.skills
        ? {
            status: this.skills.status,
            details: this.skills.getInfo(),
          }
        : undefined,
    };
  }

  getPathContext(): WorkspacePathContext {
    return {
      filesystem: {
        status: this.filesystem.status,
        instructions: this.filesystem.getInstructions(),
        info: this.filesystem.getInfo(),
      },
      sandbox: this.sandbox
        ? {
            status: this.sandbox.status,
            instructions: this.sandbox.getInstructions?.() ?? null,
            info: this.sandbox.getInfo?.(),
          }
        : undefined,
    };
  }

  getToolsConfig(): WorkspaceToolConfig | undefined {
    return this.toolConfig;
  }

  getObservabilityAttributes(): Record<string, unknown> {
    return {
      "workspace.id": this.id,
      "workspace.name": this.name,
      "workspace.scope": this.scope,
    };
  }

  private applyOperationTimeout<T extends { operationTimeoutMs?: number }>(options: T): T {
    if (options.operationTimeoutMs !== undefined || this.operationTimeoutMs === undefined) {
      return options;
    }
    return { ...options, operationTimeoutMs: this.operationTimeoutMs };
  }

  private resolveSearchToolPolicy(name: WorkspaceSearchToolName): WorkspaceToolPolicy | undefined {
    const normalized = normalizeToolPolicies(this.toolConfig?.search ?? null);
    if (!normalized) {
      return undefined;
    }
    return {
      ...(normalized.defaults ?? {}),
      ...(normalized.tools?.[name] ?? {}),
    } as WorkspaceToolPolicy;
  }

  private assertDirectSearchAllowed(name: WorkspaceSearchToolName): WorkspaceSearch {
    const searchService = this.searchService;
    if (!searchService) {
      throw new Error("Workspace search is not configured.");
    }
    if (!this.allowDirectSearchAccess) {
      throw new Error(
        "Workspace search direct access is disabled. Use search tools or enable search.allowDirectAccess.",
      );
    }
    const policy = this.resolveSearchToolPolicy(name);
    if (policy?.enabled === false) {
      throw new Error(`Workspace search tool '${name}' is disabled by policy.`);
    }
    if (policy?.needsApproval) {
      throw new Error(
        `Workspace search tool '${name}' requires approval; use the tool execution flow.`,
      );
    }
    return searchService;
  }

  async index(
    path: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<WorkspaceSearchIndexSummary> {
    return await withOperationTimeout(
      async () => {
        const searchService = this.assertDirectSearchAllowed("workspace_index_content");
        if (this.filesystem.readOnly) {
          throw new Error("Workspace filesystem is read-only.");
        }
        return searchService.indexContent(path, content, metadata);
      },
      undefined,
      this.operationTimeoutMs,
    );
  }

  async search(query: string, options?: WorkspaceSearchOptions): Promise<WorkspaceSearchResult[]> {
    return await withOperationTimeout(
      async () => {
        const searchService = this.assertDirectSearchAllowed("workspace_search");
        return searchService.search(query, options);
      },
      undefined,
      this.operationTimeoutMs,
    );
  }

  createFilesystemToolkit(options: WorkspaceFilesystemToolkitOptions = {}) {
    const mergedPolicies = mergeToolPolicies(
      this.toolConfig?.filesystem as
        | WorkspaceToolPolicies<WorkspaceFilesystemToolName, WorkspaceFilesystemToolPolicy>
        | null
        | undefined,
      options.toolPolicies ?? null,
    );
    const mergedOptions =
      mergedPolicies === undefined ? options : { ...options, toolPolicies: mergedPolicies };
    const finalOptions = this.applyOperationTimeout(mergedOptions);
    return createWorkspaceFilesystemToolkit(
      { filesystem: this.filesystem, workspace: this },
      finalOptions,
    );
  }

  createSandboxToolkit(options: WorkspaceSandboxToolkitOptions = {}) {
    const mergedPolicies = mergeToolPolicies(
      this.toolConfig?.sandbox as
        | WorkspaceToolPolicies<WorkspaceSandboxToolName, WorkspaceToolPolicy>
        | null
        | undefined,
      options.toolPolicies ?? null,
    );
    const mergedOptions =
      mergedPolicies === undefined ? options : { ...options, toolPolicies: mergedPolicies };
    const finalOptions = this.applyOperationTimeout(mergedOptions);
    return createWorkspaceSandboxToolkit(
      { sandbox: this.sandbox, workspace: this, filesystem: this.filesystem },
      finalOptions,
    );
  }

  createSearchToolkit(options: WorkspaceSearchToolkitOptions = {}) {
    const mergedPolicies = mergeToolPolicies(
      this.toolConfig?.search as
        | WorkspaceToolPolicies<WorkspaceSearchToolName, WorkspaceToolPolicy>
        | null
        | undefined,
      options.toolPolicies ?? null,
    );
    const mergedOptions =
      mergedPolicies === undefined ? options : { ...options, toolPolicies: mergedPolicies };
    const finalOptions = this.applyOperationTimeout(mergedOptions);
    return createWorkspaceSearchToolkit(
      { search: this.searchService, workspace: this, filesystem: this.filesystem },
      finalOptions,
    );
  }

  createSkillsToolkit(options: WorkspaceSkillsToolkitOptions = {}) {
    const mergedPolicies = mergeToolPolicies(
      this.toolConfig?.skills as
        | WorkspaceToolPolicies<WorkspaceSkillsToolName, WorkspaceToolPolicy>
        | null
        | undefined,
      options.toolPolicies ?? null,
    );
    const mergedOptions =
      mergedPolicies === undefined ? options : { ...options, toolPolicies: mergedPolicies };
    const finalOptions = this.applyOperationTimeout(mergedOptions);
    return createWorkspaceSkillsToolkit({ skills: this.skills, workspace: this }, finalOptions);
  }

  createSkillsPromptHook(options: WorkspaceSkillsPromptOptions = {}) {
    return createWorkspaceSkillsPromptHook({ skills: this.skills }, options);
  }
}

export type {
  WorkspaceConfig,
  WorkspaceFilesystemConfig,
  WorkspaceIdentity,
  WorkspaceScope,
  WorkspaceInfo,
  WorkspacePathContext,
  WorkspaceStatus,
};
export {
  WorkspaceFilesystem,
  createWorkspaceFilesystemToolkit,
  type WorkspaceFilesystemToolName,
  type WorkspaceFilesystemToolkitOptions,
  type WorkspaceFilesystemOptions,
  type WorkspaceFilesystemCallContext,
  type WorkspaceFilesystemReadOptions,
  type WorkspaceFilesystemWriteOptions,
  type WorkspaceFilesystemSearchOptions,
  type WorkspaceFilesystemOperationOptions,
  type WorkspaceFilesystemDeleteOptions,
  type WorkspaceFilesystemRmdirOptions,
  type DeleteResult as WorkspaceDeleteResult,
  type EditResult as WorkspaceEditResult,
  type FileData as WorkspaceFileData,
  type FileInfo as WorkspaceFileInfo,
  type FilesystemBackend as WorkspaceFilesystemBackend,
  type FilesystemBackendContext as WorkspaceFilesystemBackendContext,
  type FilesystemBackendFactory as WorkspaceFilesystemBackendFactory,
  type GrepMatch as WorkspaceGrepMatch,
  type MkdirResult as WorkspaceMkdirResult,
  type RmdirResult as WorkspaceRmdirResult,
  type WriteResult as WorkspaceWriteResult,
  LocalSandbox,
  detectLocalSandboxIsolation,
  type LocalSandboxOptions,
  type LocalSandboxIsolationOptions,
  type LocalSandboxIsolationProvider,
  type WorkspaceSandbox,
  type WorkspaceSandboxExecuteOptions,
  type WorkspaceSandboxResult,
  type WorkspaceSandboxStatus,
  type WorkspaceSandboxToolName,
  createWorkspaceSandboxToolkit,
  type WorkspaceSandboxToolkitOptions,
  type WorkspaceSandboxToolkitContext,
  WorkspaceSearch,
  createWorkspaceSearchToolkit,
  type WorkspaceSearchToolName,
  type WorkspaceSearchToolkitOptions,
  type WorkspaceSearchToolkitContext,
  WorkspaceSkills,
  createWorkspaceSkillsToolkit,
  createWorkspaceSkillsPromptHook,
  type WorkspaceSkillsToolkitOptions,
  type WorkspaceSkillsToolName,
  type WorkspaceSkillsToolkitContext,
  type WorkspaceSkillsPromptHookContext,
  type WorkspaceFilesystemToolPolicy,
  type WorkspaceToolConfig,
  type WorkspaceToolPolicies,
  type WorkspaceToolPolicy,
  type WorkspaceToolPolicyGroup,
};
export type {
  WorkspaceSearchConfig,
  WorkspaceSearchHybridWeights,
  WorkspaceSearchIndexPath,
  WorkspaceSearchIndexSummary,
  WorkspaceSearchMode,
  WorkspaceSearchOptions,
  WorkspaceSearchResult,
} from "./search/types";
export type {
  WorkspaceSkill,
  WorkspaceSkillIndexSummary,
  WorkspaceSkillMetadata,
  WorkspaceSkillSearchMode,
  WorkspaceSkillSearchOptions,
  WorkspaceSkillSearchResult,
  WorkspaceSkillsConfig,
  WorkspaceSkillsRootResolver,
  WorkspaceSkillsRootResolverContext,
  WorkspaceSkillsPromptOptions,
  WorkspaceSkillSearchHybridWeights,
} from "./skills/types";
