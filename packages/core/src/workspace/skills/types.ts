import type { OperationContext } from "../../agent/types";
import type { EmbeddingAdapterInput, VectorAdapter } from "../../memory/types";
import type { WorkspaceFilesystem, WorkspaceFilesystemCallContext } from "../filesystem";
import type { WorkspaceIdentity } from "../types";

export type WorkspaceSkillSearchMode = "bm25" | "vector" | "hybrid";

export type WorkspaceSkillSearchHybridWeights = {
  lexicalWeight?: number;
  vectorWeight?: number;
};

export type WorkspaceSkillsRootResolverContext = {
  workspace: WorkspaceIdentity;
  filesystem: WorkspaceFilesystem;
  operationContext?: OperationContext;
};

export type WorkspaceSkillsRootResolver = (
  context?: WorkspaceSkillsRootResolverContext,
) => string[] | undefined | null | Promise<string[] | undefined | null>;

export type WorkspaceSkillsConfig = {
  rootPaths?: string[] | WorkspaceSkillsRootResolver;
  glob?: string;
  maxFileBytes?: number;
  autoDiscover?: boolean;
  autoIndex?: boolean;
  bm25?: {
    k1?: number;
    b?: number;
  };
  embedding?: EmbeddingAdapterInput;
  vector?: VectorAdapter;
  defaultMode?: WorkspaceSkillSearchMode;
  hybrid?: WorkspaceSkillSearchHybridWeights;
};

export type WorkspaceSkillMetadata = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  tags?: string[];
  path: string;
  root: string;
  references?: string[];
  scripts?: string[];
  assets?: string[];
};

export type WorkspaceSkill = WorkspaceSkillMetadata & {
  instructions: string;
};

export type WorkspaceSkillSearchOptions = {
  mode?: WorkspaceSkillSearchMode;
  topK?: number;
  snippetLength?: number;
  lexicalWeight?: number;
  vectorWeight?: number;
  context?: WorkspaceFilesystemCallContext;
};

export type WorkspaceSkillSearchResult = {
  id: string;
  name: string;
  score: number;
  bm25Score?: number;
  vectorScore?: number;
  snippet?: string;
  metadata?: Record<string, unknown>;
};

export type WorkspaceSkillIndexSummary = {
  indexed: number;
  skipped: number;
  errors: string[];
};

export type WorkspaceSkillsPromptOptions = {
  includeAvailable?: boolean;
  includeActivated?: boolean;
  maxAvailable?: number;
  maxActivated?: number;
  maxInstructionChars?: number;
  maxPromptChars?: number;
};
