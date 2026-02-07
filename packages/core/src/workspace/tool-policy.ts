import type { ToolNeedsApprovalFunction } from "@ai-sdk/provider-utils";

export type WorkspaceToolPolicy = {
  enabled?: boolean;
  needsApproval?: boolean | ToolNeedsApprovalFunction<any>;
};

export type WorkspaceToolPolicyGroup<TName extends string, TPolicy = WorkspaceToolPolicy> = {
  defaults?: TPolicy;
  tools?: Partial<Record<TName, TPolicy>>;
};

export type WorkspaceToolPolicies<TName extends string, TPolicy = WorkspaceToolPolicy> =
  | Partial<Record<TName, TPolicy>>
  | WorkspaceToolPolicyGroup<TName, TPolicy>;

export type WorkspaceFilesystemToolPolicy = WorkspaceToolPolicy & {
  requireReadBeforeWrite?: boolean;
};

export type WorkspaceToolConfig = {
  filesystem?: WorkspaceToolPolicies<string, WorkspaceFilesystemToolPolicy>;
  sandbox?: WorkspaceToolPolicies<string, WorkspaceToolPolicy>;
  search?: WorkspaceToolPolicies<string, WorkspaceToolPolicy>;
  skills?: WorkspaceToolPolicies<string, WorkspaceToolPolicy>;
};
