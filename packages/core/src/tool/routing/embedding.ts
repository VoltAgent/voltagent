import { safeStringify } from "@voltagent/internal/utils";
import { AiSdkEmbeddingAdapter } from "../../memory/adapters/embedding/ai-sdk";
import type {
  EmbeddingAdapter,
  EmbeddingModelReference,
} from "../../memory/adapters/embedding/types";
import { cosineSimilarity } from "../../memory/utils/vector-math";
import { zodSchemaToJsonUI } from "../../utils/toolParser";
import type {
  ToolRoutingEmbeddingConfig,
  ToolRoutingEmbeddingInput,
  ToolSearchCandidate,
  ToolSearchStrategy,
} from "./types";

const isEmbeddingAdapter = (value: unknown): value is EmbeddingAdapter => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as EmbeddingAdapter;
  return (
    typeof candidate.embed === "function" &&
    typeof candidate.embedBatch === "function" &&
    typeof candidate.getModelName === "function"
  );
};

const normalizeEmbeddingConfig = (input: ToolRoutingEmbeddingInput): ToolRoutingEmbeddingConfig => {
  if (isEmbeddingAdapter(input)) {
    return { model: input };
  }
  if (typeof input === "object" && input !== null && "model" in input) {
    return input as ToolRoutingEmbeddingConfig;
  }
  return {
    model: input as EmbeddingAdapter | EmbeddingModelReference,
  };
};

const normalizeParametersForText = (value: unknown): unknown => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const candidate = value as { _def?: unknown; def?: unknown };
  if (candidate._def || candidate.def) {
    return zodSchemaToJsonUI(value);
  }

  return value;
};

const defaultToolText = (tool: ToolSearchCandidate): string => {
  const parts: string[] = [];
  parts.push(`Tool: ${tool.name}`);
  if (tool.description) {
    parts.push(`Description: ${tool.description}`);
  }
  if (tool.tags && tool.tags.length > 0) {
    parts.push(`Tags: ${tool.tags.join(", ")}`);
  }
  if (tool.parameters) {
    const normalized = normalizeParametersForText(tool.parameters);
    parts.push(`Parameters: ${safeStringify(normalized)}`);
  }
  return parts.join("\n");
};

export const createEmbeddingToolSearchStrategy = (
  input: ToolRoutingEmbeddingInput,
): ToolSearchStrategy => {
  const config = normalizeEmbeddingConfig(input);
  const adapter = isEmbeddingAdapter(config.model)
    ? config.model
    : new AiSdkEmbeddingAdapter(config.model as EmbeddingModelReference, {
        normalize: config.normalize ?? true,
        maxBatchSize: config.maxBatchSize,
      });
  const toolText = config.toolText ?? defaultToolText;
  const cache = new Map<string, { text: string; embedding: number[] }>();

  const getToolEmbeddings = async (
    tools: ToolSearchCandidate[],
  ): Promise<{ embeddings: number[][]; stats: { cached: number; computed: number } }> => {
    const texts: { name: string; text: string }[] = tools.map((tool) => ({
      name: tool.name,
      text: toolText(tool),
    }));

    const currentNames = new Set(texts.map((entry) => entry.name));
    for (const cachedName of cache.keys()) {
      if (!currentNames.has(cachedName)) {
        cache.delete(cachedName);
      }
    }

    const pending: Array<{ name: string; text: string }> = [];
    for (const entry of texts) {
      const cached = cache.get(entry.name);
      if (!cached || cached.text !== entry.text) {
        pending.push(entry);
      }
    }

    if (pending.length > 0) {
      const embeddings = await adapter.embedBatch(pending.map((entry) => entry.text));
      pending.forEach((entry, index) => {
        cache.set(entry.name, { text: entry.text, embedding: embeddings[index] });
      });
    }

    return {
      embeddings: texts.map((entry) => {
        const cached = cache.get(entry.name);
        return cached ? cached.embedding : [];
      }),
      stats: {
        cached: texts.length - pending.length,
        computed: pending.length,
      },
    };
  };

  return {
    select: async ({ query, tools, topK, context }) => {
      if (tools.length === 0) {
        return [];
      }

      const oc = context?.operationContext;
      const searchToolName = context?.searchToolName;
      const parentSpan = context?.parentSpan;
      const dimensions = adapter.getDimensions();
      const embeddingSpanAttributes = {
        "embedding.model": adapter.getModelName(),
        ...(dimensions ? { "embedding.dimensions": dimensions } : {}),
        ...(searchToolName ? { "tool.search.name": searchToolName } : {}),
        "tool.search.query": query,
        "tool.search.candidates": tools.length,
        "tool.search.top_k": topK,
        "tool.search.strategy": "embedding",
        input: query,
      };
      const embeddingSpan = oc?.traceContext
        ? parentSpan
          ? oc.traceContext.createChildSpanWithParent(
              parentSpan,
              `tool.search.embedding:${searchToolName ?? "search"}`,
              "embedding",
              {
                label: searchToolName
                  ? `Tool Search Embedding: ${searchToolName}`
                  : "Tool Search Embedding",
                attributes: embeddingSpanAttributes,
              },
            )
          : oc.traceContext.createChildSpan(
              `tool.search.embedding:${searchToolName ?? "search"}`,
              "embedding",
              {
                label: searchToolName
                  ? `Tool Search Embedding: ${searchToolName}`
                  : "Tool Search Embedding",
                attributes: embeddingSpanAttributes,
              },
            )
        : null;

      const runSelection = async () => {
        const queryEmbedding = await adapter.embed(query);
        const { embeddings: toolEmbeddings, stats } = await getToolEmbeddings(tools);

        const scored = tools.map((tool, index) => {
          const embedding = toolEmbeddings[index] ?? [];
          return {
            name: tool.name,
            score: embedding.length > 0 ? cosineSimilarity(queryEmbedding, embedding) : 0,
          };
        });

        return {
          scored,
          stats,
        };
      };

      if (!embeddingSpan || !oc) {
        const { scored } = await runSelection();
        return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, Math.max(0, topK));
      }

      try {
        const { scored, stats } = await oc.traceContext.withSpan(embeddingSpan, runSelection);
        oc.traceContext.endChildSpan(embeddingSpan, "completed", {
          attributes: {
            "tool.search.embedding.cache_hits": stats.cached,
            "tool.search.embedding.cache_misses": stats.computed,
          },
        });
        return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, Math.max(0, topK));
      } catch (error) {
        oc.traceContext.endChildSpan(embeddingSpan, "error", { error });
        throw error;
      }
    },
  };
};
