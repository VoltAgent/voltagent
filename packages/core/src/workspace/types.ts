import type { FileData, FilesystemBackend, FilesystemBackendFactory } from "./filesystem";
import type { WorkspaceSandbox } from "./sandbox";
import type { WorkspaceSearchConfig } from "./search/types";
import type { WorkspaceSkillsConfig } from "./skills/types";
import type { WorkspaceToolConfig } from "./tool-policy";

export type WorkspaceScope = "agent" | "conversation";

export type WorkspaceStatus = "idle" | "initializing" | "ready" | "destroyed" | "error";

export type WorkspaceComponentStatus = "idle" | "ready" | "destroyed" | "error";

export type WorkspaceIdentity = {
  id: string;
  name?: string;
  scope?: WorkspaceScope;
};

export type WorkspaceFilesystemConfig = {
  backend?: FilesystemBackend | FilesystemBackendFactory;
  files?: Record<string, FileData>;
  directories?: string[];
  readOnly?: boolean;
};

export type WorkspaceComponentInfo = {
  status?: WorkspaceComponentStatus;
  details?: Record<string, unknown>;
};

export type WorkspaceInfo = {
  id: string;
  name?: string;
  scope: WorkspaceScope;
  status: WorkspaceStatus;
  operationTimeoutMs?: number;
  filesystem?: WorkspaceComponentInfo;
  sandbox?: WorkspaceComponentInfo;
  search?: WorkspaceComponentInfo;
  skills?: WorkspaceComponentInfo;
};

export type WorkspacePathContext = {
  filesystem?: {
    status?: WorkspaceComponentStatus;
    instructions?: string | null;
    info?: Record<string, unknown>;
  };
  sandbox?: {
    status?: WorkspaceComponentStatus;
    instructions?: string | null;
    info?: Record<string, unknown>;
  };
};

export type WorkspaceConfig = {
  id?: string;
  name?: string;
  scope?: WorkspaceScope;
  operationTimeoutMs?: number;
  filesystem?: WorkspaceFilesystemConfig;
  sandbox?: WorkspaceSandbox;
  search?: WorkspaceSearchConfig;
  skills?: WorkspaceSkillsConfig;
  toolConfig?: WorkspaceToolConfig;
};
