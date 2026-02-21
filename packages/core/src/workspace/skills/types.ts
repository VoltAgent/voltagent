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

/**
 * Normalized metadata discovered from a skill's `SKILL.md`.
 *
 * @example
 * ```ts
 * const skill: WorkspaceSkillMetadata = {
 *   id: "/skills/playwright-cli",
 *   name: "playwright-cli",
 *   description: "Automates browser interactions for web testing...",
 *   path: "/skills/playwright-cli/SKILL.md",
 *   root: "/skills/playwright-cli",
 * };
 * ```
 */
export type WorkspaceSkillMetadata = {
  /**
   * Unique skill identifier.
   * Usually defaults to the normalized skill root (for example `/skills/playwright-cli`).
   */
  id: string;

  /**
   * Skill name.
   */
  name: string;

  /**
   * Human-readable skill description.
   */
  description?: string;

  /**
   * Skill version from `SKILL.md` frontmatter.
   */
  version?: string;

  /**
   * Optional skill tags from `SKILL.md` frontmatter.
   */
  tags?: string[];

  /**
   * Full path to the `SKILL.md` file.
   * Example: `/skills/playwright-cli/SKILL.md`.
   */
  path: string;

  /**
   * Root directory path of the skill.
   * Example: `/skills/playwright-cli`.
   */
  root: string;

  /**
   * Readable files under `references/`, relative to `root`.
   * Example: `["references/running-code.md"]`.
   */
  references?: string[];

  /**
   * Readable scripts under `scripts/`, relative to `root`.
   * Example: `["scripts/run.sh"]`.
   */
  scripts?: string[];

  /**
   * Readable assets under `assets/`, relative to `root`.
   * Example: `["assets/input.csv"]`.
   */
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

export type WorkspaceSkillsPromptSkill = {
  id: string;
  name: string;
  description?: string;
  path: string;
  active: boolean;
};

export type WorkspaceSkillsPromptContext = {
  available: WorkspaceSkillsPromptSkill[];
  activated: WorkspaceSkillsPromptSkill[];
};

export type WorkspaceSkillsPromptContextOptions = Omit<
  WorkspaceSkillsPromptOptions,
  "maxPromptChars"
> & {
  refresh?: boolean;
};
