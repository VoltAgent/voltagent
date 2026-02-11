import type { Span } from "@opentelemetry/api";
import micromatch from "micromatch";
import { z } from "zod";
import type { Agent } from "../../agent/agent";
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
import type { WorkspaceFilesystem, WorkspaceFilesystemCallContext } from "../filesystem";
import { truncateIfTooLong, validatePath } from "../filesystem/utils";
import { withOperationTimeout } from "../timeout";
import type {
  WorkspaceToolPolicies,
  WorkspaceToolPolicy,
  WorkspaceToolPolicyGroup,
} from "../tool-policy";
import type { WorkspaceComponentStatus, WorkspaceIdentity } from "../types";
import { WorkspaceBm25Index, tokenizeSearchText } from "./bm25";
import type {
  WorkspaceSearchConfig,
  WorkspaceSearchIndexPath,
  WorkspaceSearchIndexSummary,
  WorkspaceSearchMode,
  WorkspaceSearchOptions,
  WorkspaceSearchResult,
} from "./types";

const DEFAULT_TOP_K = 5;
const DEFAULT_SNIPPET_LENGTH = 240;
const DEFAULT_MAX_RESULT_CHARS = 2000;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const DEFAULT_HYBRID_LEXICAL_WEIGHT = 0.5;
const DEFAULT_HYBRID_VECTOR_WEIGHT = 0.5;
const WORKSPACE_SEARCH_TAGS = ["workspace", "search"] as const;

export type WorkspaceSearchToolkitOptions = {
  systemPrompt?: string | null;
  operationTimeoutMs?: number;
  customIndexDescription?: string | null;
  customIndexContentDescription?: string | null;
  customSearchDescription?: string | null;
  toolPolicies?: WorkspaceToolPolicies<WorkspaceSearchToolName> | null;
};

export type WorkspaceSearchToolkitContext = {
  search?: WorkspaceSearch;
  workspace?: WorkspaceIdentity;
  agent?: Agent;
  filesystem?: WorkspaceFilesystem;
};

export type WorkspaceSearchToolName =
  | "workspace_index"
  | "workspace_index_content"
  | "workspace_search";

type WorkspaceSearchToolOutput = {
  results: WorkspaceSearchResult[];
  total: number;
};

type WorkspaceSearchDocument = {
  id: string;
  path: string;
  content: string;
  metadata?: Record<string, unknown>;
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

const normalizePath = (value?: string): string | null => {
  if (!value) {
    return null;
  }
  try {
    return validatePath(value);
  } catch {
    return null;
  }
};

const normalizeDocumentPath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "/";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const matchesPathFilter = (docPath: string, basePath: string | null, glob?: string): boolean => {
  if (basePath && !docPath.startsWith(basePath)) {
    return false;
  }

  if (!glob) {
    return true;
  }

  const relative = basePath
    ? docPath.slice(basePath.length).replace(/^\/+/, "")
    : docPath.replace(/^\/+/, "");
  return micromatch.isMatch(relative, glob, { dot: true, nobrace: false });
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

const buildLineRange = (
  content: string,
  query: string,
): { start: number; end: number } | undefined => {
  const tokens = tokenizeSearchText(query);
  if (tokens.length === 0) {
    return undefined;
  }

  const lowerTokens = tokens.map((token) => token.toLowerCase());
  const lines = content.split("\n");
  let start: number | null = null;
  let end: number | null = null;

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx].toLowerCase();
    if (lowerTokens.some((token) => line.includes(token))) {
      if (start === null) {
        start = idx + 1;
      }
      end = idx + 1;
    }
  }

  if (start === null || end === null) {
    return undefined;
  }

  return { start, end };
};

const clampScore = (value: number): number => Math.min(1, Math.max(0, value));

const normalizeScores = (scores: Array<{ id: string; score: number }>) => {
  const maxScore = scores.reduce((max, item) => Math.max(max, item.score), 0);
  if (maxScore <= 0) {
    return new Map(scores.map((item) => [item.id, 0]));
  }
  return new Map(scores.map((item) => [item.id, clampScore(item.score / maxScore)]));
};

const clampScores = (scores: Array<{ id: string; score: number }>) =>
  new Map(scores.map((item) => [item.id, clampScore(item.score)]));

export class WorkspaceSearch {
  private readonly filesystem: WorkspaceFilesystem;
  private readonly bm25: WorkspaceBm25Index;
  private readonly documents = new Map<string, WorkspaceSearchDocument>();
  private readonly embedding?: EmbeddingAdapter;
  private readonly vector?: VectorAdapter;
  private readonly autoIndexPaths?: Array<WorkspaceSearchIndexPath | string>;
  private readonly maxFileBytes: number;
  private readonly snippetLength: number;
  private readonly defaultMode: WorkspaceSearchMode;
  private readonly defaultWeights: { lexicalWeight: number; vectorWeight: number };
  private autoIndexPromise?: Promise<void>;
  status: WorkspaceComponentStatus = "idle";

  constructor(options: WorkspaceSearchConfig & { filesystem: WorkspaceFilesystem }) {
    this.filesystem = options.filesystem;
    this.bm25 = new WorkspaceBm25Index(options.bm25);
    this.embedding = resolveEmbeddingAdapter(options.embedding);
    this.vector = options.vector;
    this.autoIndexPaths = options.autoIndexPaths;
    this.maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    this.snippetLength = options.snippetLength ?? DEFAULT_SNIPPET_LENGTH;
    this.defaultMode = options.defaultMode ?? (this.embedding && this.vector ? "hybrid" : "bm25");
    this.defaultWeights = {
      lexicalWeight: options.hybrid?.lexicalWeight ?? DEFAULT_HYBRID_LEXICAL_WEIGHT,
      vectorWeight: options.hybrid?.vectorWeight ?? DEFAULT_HYBRID_VECTOR_WEIGHT,
    };

    if (this.autoIndexPaths && this.autoIndexPaths.length > 0) {
      this.autoIndexPromise = this.indexPaths(this.autoIndexPaths)
        .then(() => undefined)
        .catch((error) => {
          console.error("Workspace search auto-index failed:", error);
          return undefined;
        });
    }
  }

  async init(): Promise<void> {
    if (this.status === "destroyed") {
      throw new Error("Workspace search has been destroyed.");
    }
    this.status = "ready";
    await this.ensureAutoIndex();
  }

  destroy(): void {
    this.status = "destroyed";
  }

  getInfo(): Record<string, unknown> {
    return {
      status: this.status,
      defaultMode: this.defaultMode,
      autoIndexPaths: this.autoIndexPaths,
      maxFileBytes: this.maxFileBytes,
      snippetLength: this.snippetLength,
      hasEmbedding: Boolean(this.embedding),
      hasVector: Boolean(this.vector),
      documentCount: this.documents.size,
    };
  }

  getInstructions(): string {
    return WORKSPACE_SEARCH_SYSTEM_PROMPT;
  }

  private async ensureAutoIndex(context?: WorkspaceFilesystemCallContext): Promise<void> {
    if (!this.autoIndexPaths || this.autoIndexPaths.length === 0) {
      return;
    }
    if (!this.autoIndexPromise) {
      this.autoIndexPromise = this.indexPaths(this.autoIndexPaths, { context })
        .then(() => undefined)
        .catch((error) => {
          console.error("Workspace search auto-index failed:", error);
          return undefined;
        });
    }
    await this.autoIndexPromise;
  }

  async indexPaths(
    paths?: Array<WorkspaceSearchIndexPath | string>,
    options?: { maxFileBytes?: number; context?: WorkspaceFilesystemCallContext },
  ): Promise<WorkspaceSearchIndexSummary> {
    const targets = paths && paths.length > 0 ? paths : (this.autoIndexPaths ?? []);
    const summary: WorkspaceSearchIndexSummary = {
      indexed: 0,
      vectorIndexed: this.embedding && this.vector ? 0 : undefined,
      skipped: 0,
      errors: [],
    };

    if (targets.length === 0) {
      return summary;
    }

    const maxFileBytes = options?.maxFileBytes ?? this.maxFileBytes;

    for (const entry of targets) {
      const target = typeof entry === "string" ? { path: entry } : entry;
      const basePath = target.path || "/";
      const glob = target.glob ?? "**/*";

      let infos: Awaited<ReturnType<WorkspaceFilesystem["globInfo"]>>;
      try {
        infos = await this.filesystem.globInfo(glob, basePath, {
          context: options?.context,
        });
      } catch (error: any) {
        summary.errors.push(
          `Failed to glob ${basePath}: ${error?.message ? String(error.message) : "unknown error"}`,
        );
        continue;
      }
      const docs: WorkspaceSearchDocument[] = [];

      for (const info of infos) {
        if (maxFileBytes > 0 && info.size && info.size > maxFileBytes) {
          summary.skipped += 1;
          continue;
        }

        try {
          const data = await this.filesystem.readRaw(info.path, {
            context: options?.context,
          });
          const content = data.content.join("\n");
          const contentBytes = Buffer.byteLength(content, "utf-8");

          if (maxFileBytes > 0 && contentBytes > maxFileBytes) {
            summary.skipped += 1;
            continue;
          }

          docs.push({
            id: info.path,
            path: info.path,
            content,
            metadata: {
              size: info.size ?? contentBytes,
              modified_at: info.modified_at,
            },
          });
        } catch (error: any) {
          summary.errors.push(
            `Failed to read ${info.path}: ${error?.message ? String(error.message) : "unknown error"}`,
          );
        }
      }

      const result = await this.indexDocuments(docs);
      summary.indexed += result.indexed;
      if (result.vectorIndexed !== undefined) {
        summary.vectorIndexed = (summary.vectorIndexed ?? 0) + result.vectorIndexed;
      }
      summary.skipped += result.skipped;
      summary.errors.push(...result.errors);
    }

    return summary;
  }

  async indexDocuments(docs: WorkspaceSearchDocument[]): Promise<WorkspaceSearchIndexSummary> {
    const summary: WorkspaceSearchIndexSummary = {
      indexed: 0,
      vectorIndexed: this.embedding && this.vector ? 0 : undefined,
      skipped: 0,
      errors: [],
    };

    if (docs.length === 0) {
      return summary;
    }

    for (const doc of docs) {
      this.bm25.addDocument({
        id: doc.id,
        path: doc.path,
        content: doc.content,
        metadata: doc.metadata,
      });
      this.documents.set(doc.id, doc);
    }

    summary.indexed += docs.length;

    if (this.embedding && this.vector) {
      try {
        const embeddings = await this.embedding.embedBatch(docs.map((doc) => doc.content));
        const items: VectorItem[] = docs.map((doc, idx) => ({
          id: doc.id,
          vector: embeddings[idx],
          metadata: {
            path: doc.path,
          },
        }));
        await this.vector.storeBatch(items);
        summary.vectorIndexed = (summary.vectorIndexed ?? 0) + docs.length;
      } catch (error: any) {
        summary.errors.push(
          `Vector indexing failed: ${error?.message ? String(error.message) : "unknown error"}`,
        );
      }
    }

    return summary;
  }

  async indexContent(
    path: string,
    content: string,
    metadata?: Record<string, unknown>,
    _options?: { context?: WorkspaceFilesystemCallContext },
  ): Promise<WorkspaceSearchIndexSummary> {
    const normalizedPath = normalizeDocumentPath(path);
    return this.indexDocuments([
      {
        id: normalizedPath,
        path: normalizedPath,
        content,
        metadata,
      },
    ]);
  }

  async search(
    query: string,
    options: WorkspaceSearchOptions = {},
  ): Promise<WorkspaceSearchResult[]> {
    await this.ensureAutoIndex(options.context);

    const mode = this.resolveMode(options.mode);
    const topK = options.topK ?? DEFAULT_TOP_K;
    const basePath = normalizePath(options.path);
    const glob = options.glob;
    const snippetLength = options.snippetLength ?? this.snippetLength;
    let lexicalWeight = options.lexicalWeight;
    let vectorWeight = options.vectorWeight;
    if (lexicalWeight === undefined && vectorWeight === undefined) {
      lexicalWeight = this.defaultWeights.lexicalWeight;
      vectorWeight = this.defaultWeights.vectorWeight;
    } else if (lexicalWeight === undefined && vectorWeight !== undefined) {
      lexicalWeight = 1 - vectorWeight;
    } else if (vectorWeight === undefined && lexicalWeight !== undefined) {
      vectorWeight = 1 - lexicalWeight;
    }
    lexicalWeight = clampScore(lexicalWeight ?? 0);
    vectorWeight = clampScore(vectorWeight ?? 0);
    const minScore = clampScore(options.minScore ?? 0);

    const filter = (doc: { path: string }) => matchesPathFilter(doc.path, basePath, glob);

    const bm25Results =
      mode === "bm25" || mode === "hybrid"
        ? this.bm25.search(query, {
            limit: topK * 5,
            filter,
          })
        : [];

    const vectorResults =
      mode === "vector" || mode === "hybrid"
        ? await this.searchVector(query, topK * 5, filter)
        : [];

    const bm25ScoreMap = new Map(bm25Results.map((item) => [item.id, item.score]));
    const vectorScoreMap = new Map(vectorResults.map((item) => [item.id, item.score]));
    const normalizedBm25 = normalizeScores(bm25Results);
    const normalizedVector = clampScores(vectorResults);

    if (mode === "bm25") {
      const normalizedResults = bm25Results.map((item) => ({
        id: item.id,
        score: normalizedBm25.get(item.id) ?? 0,
      }));
      return this.formatResults(
        normalizedResults,
        { bm25Scores: bm25ScoreMap, bm25Normalized: normalizedBm25 },
        query,
        snippetLength,
        topK,
        minScore,
      );
    }

    if (mode === "vector") {
      const normalizedResults = vectorResults.map((item) => ({
        id: item.id,
        score: normalizedVector.get(item.id) ?? 0,
      }));
      return this.formatResults(
        normalizedResults,
        { vectorScores: vectorScoreMap, vectorNormalized: normalizedVector },
        query,
        snippetLength,
        topK,
        minScore,
      );
    }
    const combined = new Map<string, { bm25?: number; vector?: number }>();

    for (const item of bm25Results) {
      combined.set(item.id, { bm25: item.score });
    }
    for (const item of vectorResults) {
      const existing = combined.get(item.id) ?? {};
      combined.set(item.id, { ...existing, vector: item.score });
    }

    const mergedResults = Array.from(combined.keys()).map((id) => {
      const bm25Score = normalizedBm25.get(id) ?? 0;
      const vectorScore = normalizedVector.get(id) ?? 0;
      const totalWeight = lexicalWeight + vectorWeight;
      const normalizedScore =
        totalWeight > 0
          ? (lexicalWeight * bm25Score + vectorWeight * vectorScore) / totalWeight
          : 0;
      return {
        id,
        score: normalizedScore,
      };
    });

    mergedResults.sort((a, b) => b.score - a.score);
    return this.formatResults(
      mergedResults,
      {
        bm25Scores: bm25ScoreMap,
        vectorScores: vectorScoreMap,
        bm25Normalized: normalizedBm25,
        vectorNormalized: normalizedVector,
      },
      query,
      snippetLength,
      topK,
      minScore,
    );
  }

  private resolveMode(requested?: WorkspaceSearchMode): WorkspaceSearchMode {
    if (!requested) {
      return this.defaultMode;
    }

    if (requested === "vector" || requested === "hybrid") {
      if (!this.embedding || !this.vector) {
        throw new Error("Vector search is not configured for this workspace.");
      }
    }

    return requested;
  }

  private async searchVector(
    query: string,
    limit: number,
    filter: (doc: { path: string }) => boolean,
  ): Promise<Array<{ id: string; score: number }>> {
    if (!this.embedding || !this.vector) {
      throw new Error("Vector search is not configured for this workspace.");
    }

    const embedding = await this.embedding.embed(query);
    const results = await this.vector.search(embedding, { limit });
    const filtered: Array<{ id: string; score: number }> = [];

    for (const item of results) {
      const path =
        typeof item.metadata?.path === "string"
          ? item.metadata.path
          : (this.documents.get(item.id)?.path ?? item.id);

      if (!filter({ path })) {
        continue;
      }

      filtered.push({ id: item.id, score: item.score });
    }

    return filtered;
  }

  private formatResults(
    results: Array<{ id: string; score: number }>,
    options: {
      bm25Scores?: Map<string, number>;
      vectorScores?: Map<string, number>;
      bm25Normalized?: Map<string, number>;
      vectorNormalized?: Map<string, number>;
    },
    query: string,
    snippetLength: number,
    limit: number,
    minScore: number,
  ): WorkspaceSearchResult[] {
    const filtered = minScore > 0 ? results.filter((item) => item.score >= minScore) : results;
    const topResults = filtered.slice(0, limit);

    return topResults.map((item) => {
      const doc = this.documents.get(item.id);
      const path = doc?.path ?? item.id;
      const content = doc?.content ?? "";
      const snippet = content ? buildSnippet(content, query, snippetLength) : undefined;
      const lineRange = content ? buildLineRange(content, query) : undefined;
      const bm25Normalized = options.bm25Normalized?.get(item.id);
      const vectorNormalized = options.vectorNormalized?.get(item.id);
      const scoreDetails =
        bm25Normalized !== undefined || vectorNormalized !== undefined
          ? {
              bm25: bm25Normalized,
              vector: vectorNormalized,
            }
          : undefined;
      return {
        id: item.id,
        path,
        score: clampScore(item.score),
        content,
        lineRange,
        scoreDetails,
        bm25Score: options.bm25Scores?.get(item.id),
        vectorScore: options.vectorScores?.get(item.id),
        snippet,
        metadata: doc?.metadata,
      };
    });
  }
}

const WORKSPACE_SEARCH_SYSTEM_PROMPT = `You can index and search workspace files.

- workspace_index: index files under a path + optional glob
- workspace_index_content: index raw content by path
- workspace_search: search indexed content (BM25/vector/hybrid).`;

const WORKSPACE_INDEX_TOOL_DESCRIPTION =
  "Index workspace files under a path and optional glob for search.";
const WORKSPACE_INDEX_CONTENT_TOOL_DESCRIPTION = "Index raw content by path for search.";
const WORKSPACE_SEARCH_TOOL_DESCRIPTION =
  "Search indexed workspace files using BM25, vector, or hybrid search (scores normalized 0-1).";

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

const formatIndexSummary = (summary: WorkspaceSearchIndexSummary): string => {
  const lines = [`Indexed ${summary.indexed} file(s).`, `Skipped ${summary.skipped} file(s).`];
  if (summary.vectorIndexed !== undefined) {
    lines.push(`Vector indexed ${summary.vectorIndexed} file(s).`);
  }
  if (summary.errors.length > 0) {
    lines.push("Errors:");
    lines.push(...summary.errors.map((err) => `- ${err}`));
  }
  return lines.join("\n");
};

const formatSearchResults = (results: WorkspaceSearchResult[]): string => {
  if (results.length === 0) {
    return "No results found.";
  }

  const lines: string[] = [];
  lines.push(`Found ${results.length} result(s):`);
  results.forEach((result, idx) => {
    const scoreParts: string[] = [`score=${result.score.toFixed(3)}`];
    if (result.scoreDetails?.bm25 !== undefined) {
      scoreParts.push(`bm25=${result.scoreDetails.bm25.toFixed(3)}`);
    }
    if (result.scoreDetails?.vector !== undefined) {
      scoreParts.push(`vector=${result.scoreDetails.vector.toFixed(3)}`);
    }
    lines.push(`${idx + 1}. ${result.path} (${scoreParts.join(", ")})`);
    if (result.lineRange) {
      lines.push(`   lines ${result.lineRange.start}-${result.lineRange.end}`);
    }
    const content = result.snippet || result.content;
    if (content) {
      const truncated = truncateIfTooLong(content, DEFAULT_MAX_RESULT_CHARS);
      const text = Array.isArray(truncated) ? truncated.join("\n") : truncated;
      lines.push(`   ${text}`);
    }
  });

  const output = lines.join("\n");
  const truncatedOutput = truncateIfTooLong(output);
  return Array.isArray(truncatedOutput) ? truncatedOutput.join("\n") : truncatedOutput;
};

export const createWorkspaceSearchToolkit = (
  context: WorkspaceSearchToolkitContext,
  options: WorkspaceSearchToolkitOptions = {},
): Toolkit => {
  const systemPrompt =
    options.systemPrompt === undefined ? WORKSPACE_SEARCH_SYSTEM_PROMPT : options.systemPrompt;

  const isToolPolicyGroup = (
    policies: WorkspaceToolPolicies<WorkspaceSearchToolName, WorkspaceToolPolicy>,
  ): policies is WorkspaceToolPolicyGroup<WorkspaceSearchToolName, WorkspaceToolPolicy> =>
    Object.prototype.hasOwnProperty.call(policies, "tools") ||
    Object.prototype.hasOwnProperty.call(policies, "defaults");

  const resolveToolPolicy = (name: WorkspaceSearchToolName) => {
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

  const isToolEnabled = (name: WorkspaceSearchToolName) => {
    const policy = resolveToolPolicy(name);
    return policy?.enabled ?? true;
  };

  const indexTool = createTool({
    name: "workspace_index",
    description: options.customIndexDescription || WORKSPACE_INDEX_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_SEARCH_TAGS],
    needsApproval: resolveToolPolicy("workspace_index")?.needsApproval,
    parameters: z.object({
      path: z.string().optional().default("/").describe("Base path to index (default: /)"),
      glob: z.string().optional().default("**/*").describe("Glob pattern to select files"),
      max_file_bytes: z.coerce.number().optional().describe("Override maximum file size to index"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "search.index",
            "workspace.fs.path": input.path || "/",
            "workspace.fs.pattern": input.glob,
          });

          if (!context.search) {
            return "Workspace search is not configured.";
          }

          const summary = await context.search.indexPaths(
            [{ path: input.path || "/", glob: input.glob }],
            {
              maxFileBytes: input.max_file_bytes,
              context: { agent: context.agent, operationContext },
            },
          );

          setWorkspaceSpanAttributes(operationContext, {
            "workspace.search.results": summary.indexed,
          });

          return formatIndexSummary(summary);
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const indexContentTool = createTool({
    name: "workspace_index_content",
    description: options.customIndexContentDescription || WORKSPACE_INDEX_CONTENT_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_SEARCH_TAGS],
    needsApproval: resolveToolPolicy("workspace_index_content")?.needsApproval,
    parameters: z.object({
      path: z.string().describe("Path identifier for the content"),
      content: z.string().describe("Raw content to index"),
      metadata: z.record(z.unknown()).optional().describe("Optional metadata"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "search.index_content",
            "workspace.fs.path": input.path,
          });

          if (!context.search) {
            return "Workspace search is not configured.";
          }

          const summary = await context.search.indexContent(
            input.path,
            input.content,
            input.metadata,
            { context: { agent: context.agent, operationContext } },
          );

          setWorkspaceSpanAttributes(operationContext, {
            "workspace.search.results": summary.indexed,
          });

          return formatIndexSummary(summary);
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const searchTool = createTool({
    name: "workspace_search",
    description: options.customSearchDescription || WORKSPACE_SEARCH_TOOL_DESCRIPTION,
    tags: [...WORKSPACE_SEARCH_TAGS],
    needsApproval: resolveToolPolicy("workspace_search")?.needsApproval,
    toModelOutput: ({ output }) => {
      if (typeof output === "string") {
        return { type: "text", value: output };
      }
      const payload = output as WorkspaceSearchToolOutput | undefined;
      const results = Array.isArray(payload?.results) ? payload.results : [];
      return {
        type: "text",
        value: formatSearchResults(results),
      };
    },
    parameters: z.object({
      query: z.string().describe("Search query"),
      mode: z.enum(["bm25", "vector", "hybrid"]).optional().describe("Search mode"),
      top_k: z.coerce.number().optional().default(DEFAULT_TOP_K),
      path: z.string().optional().default("/").describe("Base path filter (default: /)"),
      glob: z.string().optional().describe("Optional glob filter"),
      snippet_length: z.coerce.number().optional().describe("Snippet length for each result"),
      include_content: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include full content in results (default: true). Set false to prefer snippets."),
      min_score: z.coerce.number().optional().describe("Minimum normalized score (0-1)"),
      lexical_weight: z.coerce
        .number()
        .optional()
        .describe("Hybrid lexical weight (0-1). Defaults to 1 - vector_weight if omitted"),
      vector_weight: z.coerce
        .number()
        .optional()
        .describe("Hybrid vector weight (0-1). 0 = BM25 only, 1 = vector only"),
    }),
    execute: async (input, executeOptions) =>
      withOperationTimeout(
        async () => {
          const operationContext = executeOptions as OperationContext;
          setWorkspaceSpanAttributes(operationContext, {
            ...buildWorkspaceAttributes(context.workspace),
            "workspace.operation": "search.query",
            "workspace.search.query": input.query,
            "workspace.search.mode": input.mode,
            "workspace.search.top_k": input.top_k,
            "workspace.fs.path": input.path || "/",
            "workspace.fs.pattern": input.glob,
          });

          if (!context.search) {
            return "Workspace search is not configured.";
          }

          try {
            const results = await context.search.search(input.query, {
              mode: input.mode,
              topK: input.top_k,
              minScore: input.min_score,
              path: input.path || "/",
              glob: input.glob,
              snippetLength: input.snippet_length,
              lexicalWeight: input.lexical_weight,
              vectorWeight: input.vector_weight,
              context: { agent: context.agent, operationContext },
            });

            setWorkspaceSpanAttributes(operationContext, {
              "workspace.search.results": results.length,
            });

            const includeContent = input.include_content ?? true;
            const finalResults = includeContent
              ? results
              : results.map((result) => ({
                  ...result,
                  content: "",
                }));

            return {
              results: finalResults,
              total: finalResults.length,
            };
          } catch (error: any) {
            const message = error?.message ? String(error.message) : "Unknown search error";
            return `Search failed: ${message}`;
          }
        },
        executeOptions,
        options.operationTimeoutMs,
      ),
  });

  const tools = [];
  if (isToolEnabled("workspace_index")) {
    tools.push(indexTool);
  }
  if (isToolEnabled("workspace_index_content")) {
    tools.push(indexContentTool);
  }
  if (isToolEnabled("workspace_search")) {
    tools.push(searchTool);
  }

  return createToolkit({
    name: "workspace_search",
    description: "Workspace search tools (index + query)",
    tools,
    instructions: systemPrompt || undefined,
    addInstructions: Boolean(systemPrompt),
  });
};
