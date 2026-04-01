import { safeStringify } from "@voltagent/internal";
import type { BaseMessage } from "../agent/providers";
import { VoltOpsClient } from "../voltops";
import { BaseRetriever } from "./retriever";
import type { RetrieveOptions, RetrieverOptions } from "./types";

export type KnowledgeBaseTagFilter = {
  tagName: string;
  tagValue: string;
};

export type RagSearchKnowledgeBaseRequest = {
  knowledgeBaseId: string;
  query?: string | null;
  topK?: number;
  tagFilters?: KnowledgeBaseTagFilter[] | null;
};

export type RagKnowledgeBaseSummary = {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  embedding_model: string;
  embedding_dimension: number;
  chunking_config: Record<string, unknown>;
  token_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type RagSearchKnowledgeBaseChildChunk = {
  chunkIndex: number;
  content: string;
  startOffset: number;
  endOffset: number;
  similarity: number;
};

export type RagSearchKnowledgeBaseResult = {
  documentId: string;
  documentName: string;
  content: string;
  chunkIndex: number;
  similarity: number;
  metadata: Record<string, unknown>;
  childChunks?: RagSearchKnowledgeBaseChildChunk[];
};

export type RagSearchKnowledgeBaseResponse = {
  knowledgeBaseId: string;
  query: string;
  totalResults: number;
  results: RagSearchKnowledgeBaseResult[];
};

type VoltAgentRagRetrieverKnowledgeBaseOptions = {
  knowledgeBaseName: string;
};

export type VoltAgentRagRetrieverOptions = RetrieverOptions &
  VoltAgentRagRetrieverKnowledgeBaseOptions & {
    voltOpsClient?: VoltOpsClient;
    topK?: number;
    tagFilters?: KnowledgeBaseTagFilter[] | null;
    maxChunkCharacters?: number;
    includeSources?: boolean;
    includeSimilarity?: boolean;
  };

function getEnvVar(key: string): string | null {
  const env = (globalThis as any)?.process?.env as Record<string, string | undefined> | undefined;
  const value = env?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function unwrapApiEnvelope<T>(value: unknown): T | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.success !== "boolean") return null;
  if (!("data" in record)) return null;
  return record.data as T;
}

async function searchWithVoltOpsClient(
  voltOpsClient: VoltOpsClient,
  payload: RagSearchKnowledgeBaseRequest,
): Promise<RagSearchKnowledgeBaseResponse> {
  const response = await voltOpsClient.sendRequest("/rag/project/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: safeStringify(payload),
  });

  const hasJson = response.headers.get("content-type")?.includes("application/json");
  const data = hasJson ? await response.json() : undefined;

  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : "Request failed";
    throw new Error(message);
  }

  return (
    unwrapApiEnvelope<RagSearchKnowledgeBaseResponse>(data) ??
    (data as RagSearchKnowledgeBaseResponse)
  );
}

async function listKnowledgeBasesWithVoltOpsClient(
  voltOpsClient: VoltOpsClient,
): Promise<RagKnowledgeBaseSummary[]> {
  const response = await voltOpsClient.sendRequest("/rag/project/knowledge-bases", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const hasJson = response.headers.get("content-type")?.includes("application/json");
  const data = hasJson ? await response.json() : undefined;

  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : "Request failed";
    throw new Error(message);
  }

  return unwrapApiEnvelope<RagKnowledgeBaseSummary[]>(data) ?? (data as RagKnowledgeBaseSummary[]);
}

function extractTextFromMessageContent(content: BaseMessage["content"]): string {
  if (!content) return "";
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const textParts = content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          part.type === "text" &&
          typeof part.text === "string"
        ) {
          return part.text;
        }
        return "";
      })
      .filter(Boolean);

    return textParts.join(" ");
  }

  return "";
}

function extractQueryFromRetrieverInput(input: string | BaseMessage[]): string {
  if (typeof input === "string") return input;
  if (!Array.isArray(input) || input.length === 0) return "";

  const lastUserMessage = [...input].reverse().find((message) => message.role === "user");
  const message = lastUserMessage ?? input[input.length - 1];
  return extractTextFromMessageContent(message?.content);
}

function buildReferencesPayload(results: RagSearchKnowledgeBaseResult[]) {
  return results.map((result) => ({
    documentId: result.documentId,
    documentName: result.documentName,
    chunkIndex: result.chunkIndex,
    similarity: result.similarity,
  }));
}

function formatResult(
  result: RagSearchKnowledgeBaseResult,
  options: {
    includeSources: boolean;
    includeSimilarity: boolean;
    maxChunkCharacters: number | null;
  },
): string {
  const content = result.content?.trim() ?? "";
  const clipped =
    options.maxChunkCharacters && content.length > options.maxChunkCharacters
      ? `${content.slice(0, options.maxChunkCharacters).trimEnd()}...`
      : content;

  const headerParts: string[] = [];
  if (options.includeSources) {
    headerParts.push(`${result.documentName} | chunk ${result.chunkIndex + 1}`);
  }
  if (options.includeSimilarity) {
    headerParts.push(`similarity ${result.similarity.toFixed(3)}`);
  }

  if (headerParts.length === 0) {
    return clipped;
  }

  return `${headerParts.join(" | ")}\n${clipped}`;
}

/**
 * Retriever that queries VoltAgent RAG Knowledge Bases via the VoltAgent API.
 *
 * Works with the `/rag/project/search` endpoint and returns the top-k chunks as context.
 */
export class VoltAgentRagRetriever extends BaseRetriever {
  private readonly search: (
    payload: RagSearchKnowledgeBaseRequest,
  ) => Promise<RagSearchKnowledgeBaseResponse>;
  private readonly listKnowledgeBases: () => Promise<RagKnowledgeBaseSummary[]>;
  private readonly knowledgeBaseName: string | null;
  private resolvedKnowledgeBaseId: string | null = null;
  private resolveKnowledgeBaseIdPromise: Promise<string> | null = null;
  private readonly topK: number;
  private readonly tagFilters: KnowledgeBaseTagFilter[] | null;
  private readonly maxChunkCharacters: number | null;
  private readonly includeSources: boolean;
  private readonly includeSimilarity: boolean;

  constructor(options: VoltAgentRagRetrieverOptions) {
    const { voltOpsClient: providedVoltOpsClient, ...retrieverOptions } = options;

    super({
      ...retrieverOptions,
      toolName: retrieverOptions.toolName ?? "search_knowledge_base",
      toolDescription:
        retrieverOptions.toolDescription ??
        "Searches a VoltAgent Knowledge Base via the VoltAgent API and returns relevant chunks.",
    });

    const voltOpsClient =
      providedVoltOpsClient ??
      (() => {
        const publicKey = getEnvVar("VOLTAGENT_PUBLIC_KEY");
        const secretKey = getEnvVar("VOLTAGENT_SECRET_KEY");
        if (!publicKey || !secretKey) {
          throw new Error(
            "VoltAgentRagRetriever requires voltOpsClient, or env vars VOLTAGENT_PUBLIC_KEY and VOLTAGENT_SECRET_KEY.",
          );
        }

        const baseUrl = normalizeBaseUrl(
          getEnvVar("VOLTAGENT_API_BASE_URL") ?? "https://api.voltagent.dev",
        );

        return new VoltOpsClient({ baseUrl, publicKey, secretKey });
      })();

    this.search = (payload) => searchWithVoltOpsClient(voltOpsClient, payload);
    this.listKnowledgeBases = () => listKnowledgeBasesWithVoltOpsClient(voltOpsClient);
    const rawKnowledgeBaseName = (options as { knowledgeBaseName?: unknown }).knowledgeBaseName;

    this.knowledgeBaseName =
      typeof rawKnowledgeBaseName === "string" && rawKnowledgeBaseName.trim()
        ? rawKnowledgeBaseName.trim()
        : null;
    this.topK = options.topK ?? 8;
    this.tagFilters = options.tagFilters ?? null;
    this.maxChunkCharacters = options.maxChunkCharacters ?? 2_000;
    this.includeSources = options.includeSources ?? true;
    this.includeSimilarity = options.includeSimilarity ?? false;
  }

  override getObservabilityAttributes(): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    if (this.knowledgeBaseName) {
      attributes["rag.knowledge_base_name"] = this.knowledgeBaseName;
    }
    if (this.resolvedKnowledgeBaseId) {
      attributes["rag.knowledge_base_id"] = this.resolvedKnowledgeBaseId;
    }

    return attributes;
  }

  private async resolveKnowledgeBaseId(): Promise<string> {
    if (this.resolvedKnowledgeBaseId) return this.resolvedKnowledgeBaseId;

    const knowledgeBaseName = this.knowledgeBaseName;
    if (!knowledgeBaseName) {
      throw new Error("VoltAgentRagRetriever requires knowledgeBaseName.");
    }

    if (!this.resolveKnowledgeBaseIdPromise) {
      this.resolveKnowledgeBaseIdPromise = (async () => {
        const knowledgeBases = await this.listKnowledgeBases();
        const needle = knowledgeBaseName.trim().toLowerCase();

        const matches = (knowledgeBases ?? []).filter(
          (kb) => kb?.name?.trim().toLowerCase() === needle,
        );

        if (matches.length === 0) {
          throw new Error(`Knowledge base not found: ${knowledgeBaseName}`);
        }

        if (matches.length > 1) {
          throw new Error(
            `Multiple knowledge bases found named "${knowledgeBaseName}". Ensure knowledge base names are unique within your project.`,
          );
        }

        const match = matches[0];
        if (!match?.id) {
          throw new Error(`Knowledge base "${knowledgeBaseName}" is missing an id.`);
        }

        this.resolvedKnowledgeBaseId = match.id;
        return match.id;
      })();
    }

    try {
      return await this.resolveKnowledgeBaseIdPromise;
    } catch (error) {
      this.resolveKnowledgeBaseIdPromise = null;
      throw error;
    }
  }

  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    const query = extractQueryFromRetrieverInput(input).trim();
    const knowledgeBaseId = await this.resolveKnowledgeBaseId();

    const response = await this.search({
      knowledgeBaseId,
      query: query || null,
      topK: this.topK,
      tagFilters: this.tagFilters,
    });

    const results = (response?.results ?? []).filter((result) => result?.content?.trim());

    if (options.context) {
      options.context.set("rag.references", buildReferencesPayload(results));
    }

    if (results.length === 0) return "";

    return results
      .map((result) =>
        formatResult(result, {
          includeSources: this.includeSources,
          includeSimilarity: this.includeSimilarity,
          maxChunkCharacters: this.maxChunkCharacters,
        }),
      )
      .join("\n\n");
  }
}
