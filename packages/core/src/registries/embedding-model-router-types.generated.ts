/**
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT
 * Generated from https://models.dev/api.json
 */

export type EmbeddingModelsMap = {
  readonly azure: readonly [
    "cohere-embed-v-4-0",
    "cohere-embed-v3-english",
    "cohere-embed-v3-multilingual",
    "text-embedding-3-large",
    "text-embedding-3-small",
    "text-embedding-ada-002",
  ];
  readonly "azure-cognitive-services": readonly [
    "cohere-embed-v-4-0",
    "cohere-embed-v3-english",
    "cohere-embed-v3-multilingual",
    "text-embedding-3-large",
    "text-embedding-3-small",
    "text-embedding-ada-002",
  ];
  readonly "cloudflare-ai-gateway": readonly [
    "workers-ai/@cf/pfnet/plamo-embedding-1b",
    "workers-ai/@cf/qwen/qwen3-embedding-0.6b",
  ];
  readonly google: readonly ["gemini-embedding-001"];
  readonly "google-vertex": readonly ["gemini-embedding-001"];
  readonly huggingface: readonly ["Qwen/Qwen3-Embedding-4B", "Qwen/Qwen3-Embedding-8B"];
  readonly inference: readonly ["qwen/qwen3-embedding-4b"];
  readonly mistral: readonly ["mistral-embed"];
  readonly nvidia: readonly ["nvidia/llama-embed-nemotron-8b"];
  readonly openai: readonly [
    "text-embedding-3-large",
    "text-embedding-3-small",
    "text-embedding-ada-002",
  ];
  readonly "privatemode-ai": readonly ["qwen3-embedding-4b"];
  readonly vercel: readonly [
    "alibaba/qwen3-embedding-0.6b",
    "alibaba/qwen3-embedding-4b",
    "alibaba/qwen3-embedding-8b",
    "amazon/titan-embed-text-v2",
    "cohere/embed-v4.0",
    "google/gemini-embedding-001",
    "google/text-embedding-005",
    "google/text-multilingual-embedding-002",
    "mistral/codestral-embed",
    "mistral/mistral-embed",
    "openai/text-embedding-3-large",
    "openai/text-embedding-3-small",
    "openai/text-embedding-ada-002",
  ];
};

export type EmbeddingProviderId = keyof EmbeddingModelsMap;

export type EmbeddingRouterModelId =
  | {
      [P in EmbeddingProviderId]: `${P}/${EmbeddingModelsMap[P][number]}`;
    }[EmbeddingProviderId]
  | (string & {});
