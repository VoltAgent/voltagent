import type { AttributeValue, Span } from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal";
import matter from "gray-matter";
import { z } from "zod";
import type { Agent } from "../../agent/agent";
import type { AgentHooks, OnPrepareMessagesHookResult } from "../../agent/hooks";
import type { OperationContext } from "../../agent/types";
import { AiSdkEmbeddingAdapter } from "../../memory/adapters/embedding/ai-sdk";
import type {
  EmbeddingAdapter,
  EmbeddingAdapterConfig,
  EmbeddingAdapterInput,
  VectorAdapter,
  VectorItem,
} from "../../memory/types";
import { createTool } from "../../tool";
import { createToolkit } from "../../tool/toolkit";
import type { Toolkit } from "../../tool/toolkit";
import { randomUUID } from "../../utils/id";
import type { WorkspaceFilesystem } from "../filesystem";
import { WorkspaceBm25Index, tokenizeSearchText } from "../search/bm25";
import { withOperationTimeout } from "../timeout";
import type { WorkspaceToolPolicies, WorkspaceToolPolicyGroup } from "../tool-policy";
import type { WorkspaceComponentStatus, WorkspaceIdentity } from "../types";
import type {
  WorkspaceSkill,
  WorkspaceSkillIndexSummary,
  WorkspaceSkillMetadata,
  WorkspaceSkillSearchMode,
  WorkspaceSkillSearchOptions,
  WorkspaceSkillSearchResult,
  WorkspaceSkillsConfig,
  WorkspaceSkillsPromptOptions,
  WorkspaceSkillsRootResolver,
  WorkspaceSkillsRootResolverContext,
} from "./types";

const DEFAULT_SKILL_ROOTS = ["/skills"];
const DEFAULT_SKILL_GLOB = "**/SKILL.md";
const DEFAULT_MAX_FILE_BYTES = 512 * 1024;
const DEFAULT_TOP_K = 10;
const DEFAULT_SNIPPET_LENGTH = 240;
const DEFAULT_HYBRID_LEXICAL_WEIGHT = 0.5;
const DEFAULT_HYBRID_VECTOR_WEIGHT = 0.5;
const DEFAULT_MAX_AVAILABLE = 50;
const DEFAULT_MAX_ACTIVATED = 10;
const DEFAULT_MAX_INSTRUCTION_CHARS = 4000;
const DEFAULT_MAX_PROMPT_CHARS = 12000;

const SKILLS_SYSTEM_PROMPT = `You can manage workspace skills.

- workspace_list_skills: list available skills
- workspace_search_skills: search skill instructions
- workspace_read_skill: read skill instructions
- workspace_activate_skill: activate a skill for this session
- workspace_deactivate_skill: deactivate a skill
- workspace_read_skill_reference: read skill reference files
- workspace_read_skill_script: read skill scripts
- workspace_read_skill_asset: read skill assets`;

const LIST_SKILLS_DESCRIPTION = "List available workspace skills.";
const SEARCH_SKILLS_DESCRIPTION = "Search skill instructions by text query.";
const READ_SKILL_DESCRIPTION = "Read a skill's instructions from SKILL.md.";
const ACTIVATE_SKILL_DESCRIPTION = "Activate a workspace skill.";
const DEACTIVATE_SKILL_DESCRIPTION = "Deactivate a workspace skill.";
const READ_SKILL_REFERENCE_DESCRIPTION = "Read a skill reference file.";
const READ_SKILL_SCRIPT_DESCRIPTION = "Read a skill script file.";
const READ_SKILL_ASSET_DESCRIPTION = "Read a skill asset file.";
const WORKSPACE_SKILLS_TAGS = ["workspace", "skills"] as const;

export type WorkspaceSkillsToolkitOptions = {
  systemPrompt?: string | null;
  operationTimeoutMs?: number;
  customToolDescriptions?: Partial<{
    list: string;
    search: string;
    read: string;
    activate: string;
    deactivate: string;
    readReference: string;
    readScript: string;
    readAsset: string;
  }> | null;
  toolPolicies?: WorkspaceToolPolicies<WorkspaceSkillsToolName> | null;
};

export type WorkspaceSkillsToolkitContext = {
  skills?: WorkspaceSkills;
  workspace?: WorkspaceIdentity;
  agent?: Agent;
};

export type WorkspaceSkillsToolName =
  | "workspace_list_skills"
  | "workspace_search_skills"
  | "workspace_read_skill"
  | "workspace_activate_skill"
  | "workspace_deactivate_skill"
  | "workspace_read_skill_reference"
  | "workspace_read_skill_script"
  | "workspace_read_skill_asset";

export type WorkspaceSkillsPromptHookContext = {
  skills?: WorkspaceSkills;
};

const isEmbeddingAdapter = (value: EmbeddingAdapterInput): value is EmbeddingAdapter =>
  typeof value === "object" &&
  value !== null &&
  "embed" in value &&
  typeof (value as EmbeddingAdapter).embed === "function";

const isEmbeddingAdapterConfig = (value: EmbeddingAdapterInput): value is EmbeddingAdapterConfig =>
  typeof value === "object" && value !== null && "model" in value && !isEmbeddingAdapter(value);

const resolveEmbeddingAdapter = (
  embedding?: EmbeddingAdapterInput,
): EmbeddingAdapter | undefined => {
  if (!embedding) {
    return undefined;
  }

  if (isEmbeddingAdapter(embedding)) {
    return embedding;
  }

  if (typeof embedding === "string") {
    return new AiSdkEmbeddingAdapter(embedding);
  }

  if (isEmbeddingAdapterConfig(embedding)) {
    const { model, ...options } = embedding;
    return new AiSdkEmbeddingAdapter(model, options);
  }

  return new AiSdkEmbeddingAdapter(embedding);
};

const normalizeRootPath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : undefined;
  }

  return undefined;
};

const normalizePath = (value: string): string => value.replace(/\\/g, "/");

const basename = (value: string): string => {
  const normalized = normalizePath(value);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
};

const joinPaths = (root: string, relative: string): string => {
  const normalizedRoot = root === "/" ? "" : root;
  const normalizedRelative = relative.startsWith("/") ? relative.slice(1) : relative;
  if (!normalizedRoot) {
    return `/${normalizedRelative}`;
  }
  return `${normalizedRoot}/${normalizedRelative}`;
};

const truncateText = (value: string, maxChars: number): string => {
  if (maxChars <= 0) {
    return "";
  }
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}\n... [truncated]`;
};

const normalizeScores = (scores: Array<{ id: string; score: number }>) => {
  const maxScore = scores.reduce((max, item) => Math.max(max, item.score), 0);
  if (maxScore <= 0) {
    return new Map(scores.map((item) => [item.id, 0]));
  }
  return new Map(scores.map((item) => [item.id, item.score / maxScore]));
};

const buildSnippet = (content: string, query: string, length: number): string => {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= length) {
    return compact;
  }

  const terms = tokenizeSearchText(query);
  const lower = compact.toLowerCase();
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx >= 0) {
      const start = Math.max(0, idx - Math.floor(length / 2));
      const end = Math.min(compact.length, start + length);
      return compact.slice(start, end).trim();
    }
  }

  return compact.slice(0, length).trim();
};

const setWorkspaceSpanAttributes = (
  operationContext: OperationContext,
  attributes: Record<string, unknown>,
): void => {
  const toolSpan = operationContext.systemContext.get("parentToolSpan") as Span | undefined;
  if (!toolSpan) {
    return;
  }

  for (const [key, value] of Object.entries(attributes)) {
    const normalized = normalizeAttributeValue(value);
    if (normalized !== undefined) {
      toolSpan.setAttribute(key, normalized);
    }
  }
};

const normalizeAttributeValue = (value: unknown): AttributeValue | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint" || typeof value === "symbol") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const allPrimitive = value.every(
      (item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean",
    );
    if (allPrimitive) {
      return value as AttributeValue;
    }
    const serialized = safeStringify(value);
    return typeof serialized === "string" ? serialized : undefined;
  }
  if (typeof value === "object" || typeof value === "function") {
    const serialized = safeStringify(value);
    return typeof serialized === "string" ? serialized : undefined;
  }
  return undefined;
};

const buildWorkspaceAttributes = (workspace?: WorkspaceIdentity): Record<string, unknown> => ({
  "workspace.id": workspace?.id,
  "workspace.name": workspace?.name,
  "workspace.scope": workspace?.scope,
});

const formatSkillList = (skills: WorkspaceSkillMetadata[], activeIds: Set<string>): string => {
  if (skills.length === 0) {
    return "No skills found.";
  }

  const lines: string[] = [];
  skills.forEach((skill) => {
    const status = activeIds.has(skill.id) ? "active" : "inactive";
    const description = skill.description ? ` - ${skill.description}` : "";
    lines.push(`[${status}] ${skill.id} (${skill.name})${description}`);
  });

  return lines.join("\n");
};

const formatSkillDetail = (skill: WorkspaceSkill): string => {
  const lines: string[] = [];
  lines.push(`Name: ${skill.name}`);
  lines.push(`Id: ${skill.id}`);
  if (skill.description) {
    lines.push(`Description: ${skill.description}`);
  }
  if (skill.version) {
    lines.push(`Version: ${skill.version}`);
  }
  if (skill.tags && skill.tags.length > 0) {
    lines.push(`Tags: ${skill.tags.join(", ")}`);
  }
  lines.push(`Path: ${skill.path}`);
  lines.push("");
  lines.push("Instructions:");
  lines.push(skill.instructions || "(empty)");
  return lines.join("\n");
};

const formatSearchResults = (results: WorkspaceSkillSearchResult[]): string => {
  if (results.length === 0) {
    return "No results found.";
  }

  const lines: string[] = [];
  lines.push(`Found ${results.length} result(s):`);
  results.forEach((result, idx) => {
    const scoreParts: string[] = [`score=${result.score.toFixed(3)}`];
    if (result.bm25Score !== undefined) {
      scoreParts.push(`bm25=${result.bm25Score.toFixed(3)}`);
    }
    if (result.vectorScore !== undefined) {
      scoreParts.push(`vector=${result.vectorScore.toFixed(3)}`);
    }
    lines.push(`${idx + 1}. ${result.name} (${result.id}) (${scoreParts.join(", ")})`);
    if (result.snippet) {
      lines.push(`   ${result.snippet}`);
    }
  });
  return lines.join("\n");
};

const parseSkillFile = (
  content: string,
): { data: Record<string, unknown>; instructions: string } => {
  const parsed = matter(content);
  const data = (parsed.data || {}) as Record<string, unknown>;
  const instructions = parsed.content.trim();
  return { data, instructions };
};

type WorkspaceSkillDocument = {
  id: string;
  name: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export class WorkspaceSkills {
  private readonly filesystem: WorkspaceFilesystem;
  private readonly workspaceIdentity: WorkspaceSkillsRootResolverContext["workspace"];
  private rootPaths: string[];
  private readonly rootResolver?: WorkspaceSkillsRootResolver;
  private rootResolved = false;
  private rootResolvePromise?: Promise<void>;
  private readonly glob: string;
  private readonly maxFileBytes: number;
  private readonly bm25Options?: WorkspaceSkillsConfig["bm25"];
  private bm25: WorkspaceBm25Index;
  private readonly embedding?: EmbeddingAdapter;
  private readonly vector?: VectorAdapter;
  private readonly defaultMode: WorkspaceSkillSearchMode;
  private readonly defaultWeights: { lexicalWeight: number; vectorWeight: number };

  private readonly skillsById = new Map<string, WorkspaceSkillMetadata>();
  private readonly skillNameMap = new Map<string, string[]>();
  private readonly skillCache = new Map<string, WorkspaceSkill>();
  private readonly activeSkills = new Set<string>();
  private readonly documents = new Map<string, WorkspaceSkillDocument>();
  private readonly indexedSkillIds = new Set<string>();
  private discovered = false;
  private indexed = false;
  private autoDiscoverPromise?: Promise<void>;
  private autoIndexPromise?: Promise<void>;
  status: WorkspaceComponentStatus = "idle";

  constructor(
    options: WorkspaceSkillsConfig & {
      filesystem: WorkspaceFilesystem;
      workspace: WorkspaceSkillsRootResolverContext["workspace"];
    },
  ) {
    this.filesystem = options.filesystem;
    this.workspaceIdentity = options.workspace;
    const rootOption = options.rootPaths;
    if (typeof rootOption === "function") {
      this.rootResolver = rootOption;
      this.rootPaths = [];
    } else {
      const roots = rootOption && rootOption.length > 0 ? rootOption : DEFAULT_SKILL_ROOTS;
      this.rootPaths = roots.map(normalizeRootPath);
      this.rootResolved = true;
    }
    this.glob = options.glob || DEFAULT_SKILL_GLOB;
    this.maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    this.embedding = resolveEmbeddingAdapter(options.embedding);
    this.vector = options.vector;
    this.defaultMode = options.defaultMode ?? (this.embedding && this.vector ? "hybrid" : "bm25");
    this.defaultWeights = {
      lexicalWeight: options.hybrid?.lexicalWeight ?? DEFAULT_HYBRID_LEXICAL_WEIGHT,
      vectorWeight: options.hybrid?.vectorWeight ?? DEFAULT_HYBRID_VECTOR_WEIGHT,
    };
    this.bm25Options = options.bm25;
    this.bm25 = new WorkspaceBm25Index(this.bm25Options);

    const autoDiscover = options.autoDiscover ?? true;
    const autoIndex = options.autoIndex ?? false;

    if (autoDiscover) {
      const promise = this.discoverSkills().then(() => undefined);
      this.autoDiscoverPromise = promise;
      promise.catch(() => {
        if (this.autoDiscoverPromise === promise) {
          this.autoDiscoverPromise = undefined;
        }
      });
    }
    if (autoIndex) {
      const promise = this.indexSkills().then(() => undefined);
      this.autoIndexPromise = promise;
      promise.catch(() => {
        if (this.autoIndexPromise === promise) {
          this.autoIndexPromise = undefined;
        }
      });
    }
  }

  async init(): Promise<void> {
    if (this.status === "destroyed") {
      throw new Error("Workspace skills have been destroyed.");
    }
    this.status = "ready";
    await this.ensureDiscovered();
    if (this.autoIndexPromise) {
      await this.ensureIndexed();
    }
  }

  destroy(): void {
    this.status = "destroyed";
  }

  getInfo(): Record<string, unknown> {
    return {
      status: this.status,
      rootPaths: this.rootPaths,
      glob: this.glob,
      maxFileBytes: this.maxFileBytes,
      discoveredCount: this.skillsById.size,
      indexedCount: this.documents.size,
      activeCount: this.activeSkills.size,
    };
  }

  getInstructions(): string {
    return SKILLS_SYSTEM_PROMPT;
  }

  private async ensureDiscovered(): Promise<void> {
    if (this.discovered) {
      return;
    }
    if (!this.autoDiscoverPromise) {
      const promise = this.discoverSkills().then(() => undefined);
      this.autoDiscoverPromise = promise;
      promise.catch(() => {
        if (this.autoDiscoverPromise === promise) {
          this.autoDiscoverPromise = undefined;
        }
      });
    }
    const promise = this.autoDiscoverPromise;
    try {
      await promise;
    } catch (error) {
      if (this.autoDiscoverPromise === promise) {
        this.autoDiscoverPromise = undefined;
      }
      throw error;
    }
  }

  private async ensureRootPaths(): Promise<void> {
    if (this.rootResolved) {
      return;
    }
    if (!this.rootResolver) {
      this.rootResolved = true;
      if (this.rootPaths.length === 0) {
        this.rootPaths = DEFAULT_SKILL_ROOTS.map(normalizeRootPath);
      }
      return;
    }
    if (!this.rootResolvePromise) {
      this.rootResolvePromise = (async () => {
        try {
          const resolved = await this.rootResolver?.({
            workspace: this.workspaceIdentity,
            filesystem: this.filesystem,
          });
          const normalized = normalizeStringArray(resolved) ?? DEFAULT_SKILL_ROOTS;
          this.rootPaths = normalized.map(normalizeRootPath);
          this.rootResolved = true;
        } catch (error) {
          this.rootResolvePromise = undefined;
          throw error;
        }
      })();
    }
    await this.rootResolvePromise;
  }

  private async ensureIndexed(): Promise<void> {
    if (this.indexed) {
      return;
    }
    if (!this.autoIndexPromise) {
      const promise = this.indexSkills().then(() => undefined);
      this.autoIndexPromise = promise;
      promise.catch(() => {
        if (this.autoIndexPromise === promise) {
          this.autoIndexPromise = undefined;
        }
      });
    }
    const promise = this.autoIndexPromise;
    try {
      await promise;
    } catch (error) {
      if (this.autoIndexPromise === promise) {
        this.autoIndexPromise = undefined;
      }
      throw error;
    }
  }

  async discoverSkills(options: { refresh?: boolean } = {}): Promise<WorkspaceSkillMetadata[]> {
    if (this.discovered && !options.refresh) {
      return Array.from(this.skillsById.values());
    }

    await this.ensureRootPaths();

    this.skillsById.clear();
    this.skillNameMap.clear();
    this.skillCache.clear();
    this.discovered = false;
    this.indexed = false;
    this.documents.clear();
    this.bm25 = new WorkspaceBm25Index(this.bm25Options);

    for (const root of this.rootPaths) {
      let infos: Awaited<ReturnType<WorkspaceFilesystem["globInfo"]>>;
      try {
        infos = await this.filesystem.globInfo(this.glob, root);
      } catch {
        continue;
      }

      for (const info of infos) {
        const skillPath = info.path;
        if (this.maxFileBytes > 0 && info.size && info.size > this.maxFileBytes) {
          continue;
        }

        try {
          const data = await this.filesystem.readRaw(skillPath);
          const content = data.content.join("\n");
          const contentBytes = Buffer.byteLength(content, "utf-8");
          if (this.maxFileBytes > 0 && contentBytes > this.maxFileBytes) {
            continue;
          }

          const normalizedPath = normalizePath(skillPath);
          const rootPath = normalizedPath.replace(/\/SKILL\.md$/i, "");
          const { data: frontmatter } = parseSkillFile(content);
          const name =
            typeof frontmatter.name === "string" && frontmatter.name.trim().length > 0
              ? frontmatter.name.trim()
              : basename(rootPath) || basename(normalizedPath) || "skill";
          const rawId =
            typeof frontmatter.id === "string" && frontmatter.id.trim().length > 0
              ? frontmatter.id.trim()
              : rootPath || normalizedPath;

          let id = rawId;
          if (this.skillsById.has(id)) {
            let suffix = 2;
            while (this.skillsById.has(`${id}-${suffix}`)) {
              suffix += 1;
            }
            id = `${id}-${suffix}`;
          }

          const metadata: WorkspaceSkillMetadata = {
            id,
            name,
            description:
              typeof frontmatter.description === "string" ? frontmatter.description : undefined,
            version: typeof frontmatter.version === "string" ? frontmatter.version : undefined,
            tags: normalizeStringArray(frontmatter.tags),
            path: skillPath,
            root: rootPath || root,
            references: normalizeStringArray(frontmatter.references),
            scripts: normalizeStringArray(frontmatter.scripts),
            assets: normalizeStringArray(frontmatter.assets),
          };

          this.skillsById.set(id, metadata);
          const normalizedName = name.trim().toLowerCase();
          if (normalizedName) {
            const existing = this.skillNameMap.get(normalizedName) ?? [];
            existing.push(id);
            this.skillNameMap.set(normalizedName, existing);
          }
        } catch {
          // ignore invalid skill entries
        }
      }
    }

    this.discovered = true;
    return Array.from(this.skillsById.values());
  }

  async loadSkill(identifier: string): Promise<WorkspaceSkill | null> {
    await this.ensureDiscovered();
    const id = this.resolveSkillId(identifier);
    if (!id) {
      return null;
    }

    const cached = this.skillCache.get(id);
    if (cached) {
      return cached;
    }

    const metadata = this.skillsById.get(id);
    if (!metadata) {
      return null;
    }

    const data = await this.filesystem.readRaw(metadata.path);
    const content = data.content.join("\n");
    const { data: frontmatter, instructions } = parseSkillFile(content);
    const detail: WorkspaceSkill = {
      ...metadata,
      description:
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : metadata.description,
      version: typeof frontmatter.version === "string" ? frontmatter.version : metadata.version,
      tags: normalizeStringArray(frontmatter.tags) ?? metadata.tags,
      references: normalizeStringArray(frontmatter.references) ?? metadata.references,
      scripts: normalizeStringArray(frontmatter.scripts) ?? metadata.scripts,
      assets: normalizeStringArray(frontmatter.assets) ?? metadata.assets,
      instructions,
    };

    this.skillCache.set(id, detail);
    return detail;
  }

  async activateSkill(identifier: string): Promise<WorkspaceSkillMetadata | null> {
    await this.ensureDiscovered();
    const id = this.resolveSkillId(identifier);
    if (!id) {
      return null;
    }
    this.activeSkills.add(id);
    return this.skillsById.get(id) ?? null;
  }

  async deactivateSkill(identifier: string): Promise<boolean> {
    await this.ensureDiscovered();
    const id = this.resolveSkillId(identifier);
    if (!id) {
      return false;
    }
    return this.activeSkills.delete(id);
  }

  getActiveSkills(): WorkspaceSkillMetadata[] {
    return Array.from(this.activeSkills)
      .map((id) => this.skillsById.get(id))
      .filter((skill): skill is WorkspaceSkillMetadata => Boolean(skill));
  }

  async indexSkills(): Promise<WorkspaceSkillIndexSummary> {
    await this.ensureDiscovered();

    const summary: WorkspaceSkillIndexSummary = {
      indexed: 0,
      skipped: 0,
      errors: [],
    };

    if (this.skillsById.size === 0) {
      this.indexed = true;
      return summary;
    }

    const previousIds = Array.from(this.indexedSkillIds);
    this.indexedSkillIds.clear();
    this.documents.clear();
    this.bm25 = new WorkspaceBm25Index(this.bm25Options);

    if (this.vector && previousIds.length > 0) {
      try {
        await this.vector.deleteBatch(previousIds);
      } catch (error: any) {
        summary.errors.push(
          `Vector cleanup failed: ${error?.message ? String(error.message) : "unknown error"}`,
        );
      }
    }

    const docs: WorkspaceSkillDocument[] = [];

    for (const metadata of this.skillsById.values()) {
      try {
        const skill = await this.loadSkill(metadata.id);
        if (!skill) {
          summary.skipped += 1;
          continue;
        }

        const content = [skill.name, skill.description || "", skill.instructions || ""]
          .join("\n")
          .trim();

        if (!content) {
          summary.skipped += 1;
          continue;
        }

        docs.push({
          id: skill.id,
          name: skill.name,
          content,
          metadata: {
            path: skill.path,
            tags: skill.tags,
          },
        });
      } catch (error: any) {
        summary.errors.push(
          `Failed to load ${metadata.id}: ${error?.message ? String(error.message) : "unknown error"}`,
        );
      }
    }

    for (const doc of docs) {
      this.bm25.addDocument({
        id: doc.id,
        path: doc.name,
        content: doc.content,
        metadata: doc.metadata,
      });
      this.documents.set(doc.id, doc);
      this.indexedSkillIds.add(doc.id);
    }

    if (this.embedding && this.vector) {
      try {
        const embeddings = await this.embedding.embedBatch(docs.map((doc) => doc.content));
        if (!Array.isArray(embeddings) || embeddings.length !== docs.length) {
          throw new Error(
            `Embedding batch size mismatch (expected ${docs.length}, got ${Array.isArray(embeddings) ? embeddings.length : "non-array"})`,
          );
        }
        const items: VectorItem[] = [];
        embeddings.forEach((vector, idx) => {
          if (!vector) {
            summary.errors.push(`Vector embedding missing for skill ${docs[idx]?.id ?? "unknown"}`);
            return;
          }
          const doc = docs[idx];
          items.push({
            id: doc.id,
            vector,
            metadata: {
              skill_name: doc.name,
              path: doc.metadata?.path,
            },
          });
        });
        if (items.length > 0) {
          await this.vector.storeBatch(items);
        }
      } catch (error: any) {
        summary.errors.push(
          `Vector indexing failed: ${error?.message ? String(error.message) : "unknown error"}`,
        );
      }
    }

    summary.indexed = docs.length;
    this.indexed = true;
    return summary;
  }

  async search(
    query: string,
    options: WorkspaceSkillSearchOptions = {},
  ): Promise<WorkspaceSkillSearchResult[]> {
    await this.ensureIndexed();

    const mode = this.resolveMode(options.mode);
    const topK = options.topK ?? DEFAULT_TOP_K;
    const snippetLength = options.snippetLength ?? DEFAULT_SNIPPET_LENGTH;
    const lexicalWeight = options.lexicalWeight ?? this.defaultWeights.lexicalWeight;
    const vectorWeight = options.vectorWeight ?? this.defaultWeights.vectorWeight;

    const bm25Results =
      mode === "bm25" || mode === "hybrid" ? this.bm25.search(query, { limit: topK * 5 }) : [];

    const vectorResults =
      mode === "vector" || mode === "hybrid" ? await this.searchVector(query, topK * 5) : [];

    if (mode === "bm25") {
      return this.formatResults(
        bm25Results,
        { bm25Scores: new Map(bm25Results.map((item) => [item.id, item.score])) },
        query,
        snippetLength,
        topK,
      );
    }

    if (mode === "vector") {
      return this.formatResults(
        vectorResults,
        { vectorScores: new Map(vectorResults.map((item) => [item.id, item.score])) },
        query,
        snippetLength,
        topK,
      );
    }

    const normalizedBm25 = normalizeScores(bm25Results);
    const normalizedVector = normalizeScores(vectorResults);
    const combined = new Map<string, { bm25?: number; vector?: number }>();

    for (const item of bm25Results) {
      combined.set(item.id, { bm25: item.score });
    }
    for (const item of vectorResults) {
      const existing = combined.get(item.id) ?? {};
      combined.set(item.id, { ...existing, vector: item.score });
    }

    const mergedResults = Array.from(combined.entries()).map(([id, scores]) => {
      const bm25Score = scores.bm25 ?? 0;
      const vectorScore = scores.vector ?? 0;
      const normalizedScore =
        lexicalWeight * (normalizedBm25.get(id) ?? 0) +
        vectorWeight * (normalizedVector.get(id) ?? 0);
      return {
        id,
        score: normalizedScore,
        bm25Score,
        vectorScore,
      };
    });

    mergedResults.sort((a, b) => b.score - a.score);
    return this.formatResults(
      mergedResults,
      {
        bm25Scores: new Map(bm25Results.map((item) => [item.id, item.score])),
        vectorScores: new Map(vectorResults.map((item) => [item.id, item.score])),
      },
      query,
      snippetLength,
      topK,
    );
  }

  async buildPrompt(options: WorkspaceSkillsPromptOptions = {}): Promise<string | null> {
    await this.ensureDiscovered();

    const includeAvailable = options.includeAvailable ?? true;
    const includeActivated = options.includeActivated ?? true;
    const maxAvailable = options.maxAvailable ?? DEFAULT_MAX_AVAILABLE;
    const maxActivated = options.maxActivated ?? DEFAULT_MAX_ACTIVATED;
    const maxInstructionChars = options.maxInstructionChars ?? DEFAULT_MAX_INSTRUCTION_CHARS;
    const maxPromptChars = options.maxPromptChars ?? DEFAULT_MAX_PROMPT_CHARS;

    const sections: string[] = [];

    if (includeAvailable) {
      const skills = Array.from(this.skillsById.values()).slice(0, maxAvailable);
      if (skills.length > 0) {
        const lines = skills.map((skill) => {
          const description = skill.description ? ` - ${skill.description}` : "";
          return `- ${skill.name} (${skill.id})${description}`;
        });
        sections.push(`Available skills:\n${lines.join("\n")}`);
      }
    }

    if (includeActivated) {
      const activeIds = Array.from(this.activeSkills).slice(0, maxActivated);
      if (activeIds.length > 0) {
        const entries: string[] = [];
        for (const id of activeIds) {
          const skill = await this.loadSkill(id);
          if (!skill) {
            continue;
          }
          const header = `${skill.name} (${skill.id})`;
          const body = truncateText(skill.instructions || "", maxInstructionChars);
          entries.push(`${header}\n${body}`);
        }
        if (entries.length > 0) {
          sections.push(`Activated skills:\n${entries.join("\n\n")}`);
        }
      }
    }

    if (sections.length === 0) {
      return null;
    }

    const prompt = `<workspace_skills>\n${sections.join("\n\n")}\n</workspace_skills>`;
    return truncateText(prompt, maxPromptChars);
  }

  private resolveMode(requested?: WorkspaceSkillSearchMode): WorkspaceSkillSearchMode {
    if (!requested) {
      return this.defaultMode;
    }

    if (requested === "vector" || requested === "hybrid") {
      if (!this.embedding || !this.vector) {
        throw new Error("Vector search is not configured for skills.");
      }
    }

    return requested;
  }

  private async searchVector(
    query: string,
    limit: number,
  ): Promise<Array<{ id: string; score: number }>> {
    if (!this.embedding || !this.vector) {
      throw new Error("Vector search is not configured for skills.");
    }

    const embedding = await this.embedding.embed(query);
    const results = await this.vector.search(embedding, { limit });
    return results.map((item) => ({ id: item.id, score: item.score }));
  }

  private formatResults(
    results: Array<{ id: string; score: number }>,
    options: {
      bm25Scores?: Map<string, number>;
      vectorScores?: Map<string, number>;
    },
    query: string,
    snippetLength: number,
    limit: number,
  ): WorkspaceSkillSearchResult[] {
    const topResults = results.slice(0, limit);
    return topResults.map((item) => {
      const doc = this.documents.get(item.id);
      const name = doc?.name ?? item.id;
      const snippet = doc?.content ? buildSnippet(doc.content, query, snippetLength) : undefined;
      return {
        id: item.id,
        name,
        score: item.score,
        bm25Score: options.bm25Scores?.get(item.id),
        vectorScore: options.vectorScores?.get(item.id),
        snippet,
        metadata: doc?.metadata,
      };
    });
  }

  private resolveSkillId(identifier: string): string | null {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return null;
    }

    if (this.skillsById.has(trimmed)) {
      return trimmed;
    }

    const normalized = trimmed.toLowerCase();
    const matches = this.skillNameMap.get(normalized);
    if (matches && matches.length > 0) {
      return matches[0];
    }

    return null;
  }

  resolveSkillFilePath(
    skill: WorkspaceSkillMetadata,
    relativePath: string,
    allowed: string[] | undefined,
  ): string | null {
    const normalized = relativePath.trim();
    if (!normalized) {
      return null;
    }

    if (normalized.includes("..")) {
      return null;
    }

    const normalizedAllowed = allowed?.map((entry) => normalizePath(entry)) || [];
    const matched = normalizedAllowed.find(
      (entry) => entry === normalized || entry.endsWith(`/${normalized}`),
    );

    if (!matched) {
      return null;
    }

    const cleaned = normalizePath(matched);
    if (cleaned.startsWith("/")) {
      const rootPrefix = skill.root === "/" ? "/" : `${skill.root}/`;
      if (!cleaned.startsWith(rootPrefix)) {
        return null;
      }
      return cleaned;
    }

    return joinPaths(skill.root, cleaned);
  }

  async readFileContent(filePath: string): Promise<string> {
    const data = await this.filesystem.readRaw(filePath);
    return data.content.join("\n");
  }
}

export const createWorkspaceSkillsPromptHook = (
  context: WorkspaceSkillsPromptHookContext,
  options: WorkspaceSkillsPromptOptions = {},
): AgentHooks => ({
  onPrepareMessages: async ({ messages }): Promise<OnPrepareMessagesHookResult> => {
    if (!context.skills) {
      return { messages };
    }

    const prompt = await context.skills.buildPrompt(options);
    if (!prompt) {
      return { messages };
    }

    const systemMessage = {
      id: randomUUID(),
      role: "system" as const,
      parts: [{ type: "text" as const, text: prompt }],
    };

    return { messages: [systemMessage, ...messages] };
  },
});

export const createWorkspaceSkillsToolkit = (
  context: WorkspaceSkillsToolkitContext,
  options: WorkspaceSkillsToolkitOptions = {},
): Toolkit => {
  const systemPrompt =
    options.systemPrompt === undefined ? SKILLS_SYSTEM_PROMPT : options.systemPrompt;

  const isToolPolicyGroup = (
    policies: WorkspaceToolPolicies<WorkspaceSkillsToolName>,
  ): policies is WorkspaceToolPolicyGroup<WorkspaceSkillsToolName> =>
    Object.prototype.hasOwnProperty.call(policies, "tools") ||
    Object.prototype.hasOwnProperty.call(policies, "defaults");

  const resolveToolPolicy = (name: WorkspaceSkillsToolName) => {
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

  const isToolEnabled = (name: WorkspaceSkillsToolName) => resolveToolPolicy(name)?.enabled ?? true;

  const listTool = createTool({
    name: "workspace_list_skills",
    description: options.customToolDescriptions?.list || LIST_SKILLS_DESCRIPTION,
    tags: [...WORKSPACE_SKILLS_TAGS],
    needsApproval: resolveToolPolicy("workspace_list_skills")?.needsApproval,
    parameters: z.object({
      refresh: z.boolean().optional().describe("Refresh skill discovery"),
      active_only: z.boolean().optional().describe("Only list active skills"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "skills.list",
          });

          if (!context.skills) {
            return "Workspace skills are not configured.";
          }

          const skills = await context.skills.discoverSkills({ refresh: Boolean(input.refresh) });
          const activeIds = new Set(context.skills.getActiveSkills().map((skill) => skill.id));
          const listed = input.active_only
            ? skills.filter((skill) => activeIds.has(skill.id))
            : skills;
          return formatSkillList(listed, activeIds);
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const searchTool = createTool({
    name: "workspace_search_skills",
    description: options.customToolDescriptions?.search || SEARCH_SKILLS_DESCRIPTION,
    tags: [...WORKSPACE_SKILLS_TAGS],
    needsApproval: resolveToolPolicy("workspace_search_skills")?.needsApproval,
    parameters: z.object({
      query: z.string().describe("Search query"),
      mode: z.enum(["bm25", "vector", "hybrid"]).optional().describe("Search mode"),
      top_k: z.coerce.number().optional().default(DEFAULT_TOP_K),
      snippet_length: z.coerce.number().optional().describe("Snippet length for each result"),
      lexical_weight: z.coerce.number().optional().describe("Hybrid lexical weight"),
      vector_weight: z.coerce.number().optional().describe("Hybrid vector weight"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "skills.search",
            "workspace.search.query": input.query,
            "workspace.search.mode": input.mode,
            "workspace.search.top_k": input.top_k,
          });

          if (!context.skills) {
            return "Workspace skills are not configured.";
          }

          try {
            const results = await context.skills.search(input.query, {
              mode: input.mode,
              topK: input.top_k,
              snippetLength: input.snippet_length,
              lexicalWeight: input.lexical_weight,
              vectorWeight: input.vector_weight,
            });

            setWorkspaceSpanAttributes(operationContext, {
              "workspace.search.results": results.length,
            });

            return formatSearchResults(results);
          } catch (error: any) {
            const message = error?.message ? String(error.message) : "Unknown search error";
            return `Search failed: ${message}`;
          }
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const readSkillTool = createTool({
    name: "workspace_read_skill",
    description: options.customToolDescriptions?.read || READ_SKILL_DESCRIPTION,
    tags: [...WORKSPACE_SKILLS_TAGS],
    needsApproval: resolveToolPolicy("workspace_read_skill")?.needsApproval,
    parameters: z.object({
      skill_id: z.string().describe("Skill id or name"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "skills.read",
            "workspace.skills.name": input.skill_id,
          });

          if (!context.skills) {
            return "Workspace skills are not configured.";
          }

          const skill = await context.skills.loadSkill(input.skill_id);
          if (!skill) {
            return `Skill not found: ${input.skill_id}`;
          }

          setWorkspaceSpanAttributes(operationContext, {
            "workspace.skills.name": skill.name,
            "workspace.skills.source": skill.path,
          });

          return formatSkillDetail(skill);
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const activateSkillTool = createTool({
    name: "workspace_activate_skill",
    description: options.customToolDescriptions?.activate || ACTIVATE_SKILL_DESCRIPTION,
    tags: [...WORKSPACE_SKILLS_TAGS],
    needsApproval: resolveToolPolicy("workspace_activate_skill")?.needsApproval,
    parameters: z.object({
      skill_id: z.string().describe("Skill id or name"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "skills.activate",
            "workspace.skills.name": input.skill_id,
          });

          if (!context.skills) {
            return "Workspace skills are not configured.";
          }

          const skill = await context.skills.activateSkill(input.skill_id);
          if (!skill) {
            return `Skill not found: ${input.skill_id}`;
          }

          setWorkspaceSpanAttributes(operationContext, {
            "workspace.skills.name": skill.name,
            "workspace.skills.source": skill.path,
          });

          return `Activated skill: ${skill.name} (${skill.id})`;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const deactivateSkillTool = createTool({
    name: "workspace_deactivate_skill",
    description: options.customToolDescriptions?.deactivate || DEACTIVATE_SKILL_DESCRIPTION,
    tags: [...WORKSPACE_SKILLS_TAGS],
    needsApproval: resolveToolPolicy("workspace_deactivate_skill")?.needsApproval,
    parameters: z.object({
      skill_id: z.string().describe("Skill id or name"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "skills.deactivate",
            "workspace.skills.name": input.skill_id,
          });

          if (!context.skills) {
            return "Workspace skills are not configured.";
          }

          const success = await context.skills.deactivateSkill(input.skill_id);
          if (!success) {
            return `Skill not found: ${input.skill_id}`;
          }

          return `Deactivated skill: ${input.skill_id}`;
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const readSkillFile = async (
    skillId: string,
    filePath: string,
    kind: "reference" | "script" | "asset",
    executeOptions: unknown,
  ): Promise<string> => {
    const operationContext = executeOptions as OperationContext;
    setWorkspaceSpanAttributes(operationContext, {
      ...buildWorkspaceAttributes(context.workspace),
      "workspace.operation": `skills.read_${kind}`,
      "workspace.skills.name": skillId,
    });

    if (!context.skills) {
      return "Workspace skills are not configured.";
    }

    const skill = await context.skills.loadSkill(skillId);
    if (!skill) {
      return `Skill not found: ${skillId}`;
    }

    const list =
      kind === "reference" ? skill.references : kind === "script" ? skill.scripts : skill.assets;

    const resolvedPath = context.skills.resolveSkillFilePath(skill, filePath, list);
    if (!resolvedPath) {
      const available = list && list.length > 0 ? list.join(", ") : "none";
      return `File not allowed for ${kind}. Available: ${available}`;
    }

    setWorkspaceSpanAttributes(operationContext, {
      "workspace.skills.name": skill.name,
      "workspace.skills.source": resolvedPath,
      "workspace.fs.path": resolvedPath,
    });

    try {
      const content = await context.skills.readFileContent(resolvedPath);
      return content || "(empty)";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorkspaceSpanAttributes(operationContext, {
        "workspace.error": message,
      });
      return `Error reading skill file: ${message}`;
    }
  };

  const readReferenceTool = createTool({
    name: "workspace_read_skill_reference",
    description: options.customToolDescriptions?.readReference || READ_SKILL_REFERENCE_DESCRIPTION,
    tags: [...WORKSPACE_SKILLS_TAGS],
    needsApproval: resolveToolPolicy("workspace_read_skill_reference")?.needsApproval,
    parameters: z.object({
      skill_id: z.string().describe("Skill id or name"),
      reference: z.string().describe("Reference file path"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => readSkillFile(input.skill_id, input.reference, "reference", executeOptions),
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const readScriptTool = createTool({
    name: "workspace_read_skill_script",
    description: options.customToolDescriptions?.readScript || READ_SKILL_SCRIPT_DESCRIPTION,
    tags: [...WORKSPACE_SKILLS_TAGS],
    needsApproval: resolveToolPolicy("workspace_read_skill_script")?.needsApproval,
    parameters: z.object({
      skill_id: z.string().describe("Skill id or name"),
      script: z.string().describe("Script file path"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => readSkillFile(input.skill_id, input.script, "script", executeOptions),
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const readAssetTool = createTool({
    name: "workspace_read_skill_asset",
    description: options.customToolDescriptions?.readAsset || READ_SKILL_ASSET_DESCRIPTION,
    tags: [...WORKSPACE_SKILLS_TAGS],
    needsApproval: resolveToolPolicy("workspace_read_skill_asset")?.needsApproval,
    parameters: z.object({
      skill_id: z.string().describe("Skill id or name"),
      asset: z.string().describe("Asset file path"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => readSkillFile(input.skill_id, input.asset, "asset", executeOptions),
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const tools = [];
  if (isToolEnabled("workspace_list_skills")) {
    tools.push(listTool);
  }
  if (isToolEnabled("workspace_search_skills")) {
    tools.push(searchTool);
  }
  if (isToolEnabled("workspace_read_skill")) {
    tools.push(readSkillTool);
  }
  if (isToolEnabled("workspace_activate_skill")) {
    tools.push(activateSkillTool);
  }
  if (isToolEnabled("workspace_deactivate_skill")) {
    tools.push(deactivateSkillTool);
  }
  if (isToolEnabled("workspace_read_skill_reference")) {
    tools.push(readReferenceTool);
  }
  if (isToolEnabled("workspace_read_skill_script")) {
    tools.push(readScriptTool);
  }
  if (isToolEnabled("workspace_read_skill_asset")) {
    tools.push(readAssetTool);
  }

  return createToolkit({
    name: "workspace_skills",
    description: "Workspace skill management tools",
    tools,
    instructions: systemPrompt || undefined,
    addInstructions: Boolean(systemPrompt),
  });
};
