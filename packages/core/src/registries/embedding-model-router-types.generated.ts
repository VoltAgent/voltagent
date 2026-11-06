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
  readonly digitalocean: readonly ["gte-large-en-v1.5", "qwen3-embedding-0.6b"];
  readonly evroc: readonly ["Qwen/Qwen3-Embedding-8B", "intfloat/multilingual-e5-large-instruct"];
  readonly google: readonly ["gemini-embedding-001", "gemini-embedding-2"];
  readonly "google-vertex": readonly ["gemini-embedding-001"];
  readonly huggingface: readonly ["Qwen/Qwen3-Embedding-4B", "Qwen/Qwen3-Embedding-8B"];
  readonly inferx: readonly ["Qwen3-Embedding-8B"];
  readonly infomaniak: readonly ["bge_multilingual_gemma2", "mini_lm_l12_v2"];
  readonly "merge-gateway": readonly ["google/gemini-embedding-001", "google/gemini-embedding-2"];
  readonly mistral: readonly ["mistral-embed"];
  readonly nearai: readonly ["Qwen/Qwen3-Embedding-0.6B"];
  readonly nebius: readonly ["Qwen/Qwen3-Embedding-8B"];
  readonly "novita-ai": readonly ["qwen/qwen3-embedding-8b"];
  readonly nvidia: readonly ["nvidia/llama-nemotron-embed-vl-1b-v2"];
  readonly openai: readonly [
    "text-embedding-3-large",
    "text-embedding-3-small",
    "text-embedding-ada-002",
  ];
  readonly "privatemode-ai": readonly ["qwen3-embedding-4b"];
  readonly "regolo-ai": readonly ["qwen3-embedding-8b"];
  readonly "sap-ai-core": readonly [
    "amazon--titan-embed-text",
    "gemini-embedding",
    "gemini-embedding-2",
    "nvidia--llama-nemotron-embed-1b",
    "text-embedding-3-large",
    "text-embedding-3-small",
  ];
  readonly scaleway: readonly ["qwen3-embedding-8b"];
  readonly stackit: readonly ["Qwen/Qwen3-VL-Embedding-8B"];
  readonly tempr: readonly [
    "google/gemini-embedding-001",
    "google/gemini-embedding-2",
    "mistral/mistral-embed",
  ];
  readonly tinfoil: readonly ["nomic-embed-text"];
  readonly vercel: readonly [
    "alibaba/qwen3-embedding-0.6b",
    "alibaba/qwen3-embedding-4b",
    "alibaba/qwen3-embedding-8b",
    "amazon/titan-embed-text-v2",
    "cohere/embed-v4.0",
    "cohere/embed-v5.0-fast",
    "cohere/embed-v5.0-pro",
    "google/gemini-embedding-001",
    "google/gemini-embedding-2",
    "google/text-embedding-005",
    "google/text-multilingual-embedding-002",
    "mistral/codestral-embed",
    "mistral/mistral-embed",
    "openai/text-embedding-3-large",
    "openai/text-embedding-3-small",
    "openai/text-embedding-ada-002",
    "perplexity/pplx-embed-v1-0.6b",
    "perplexity/pplx-embed-v1-4b",
  ];
};

export type EmbeddingProviderId = keyof EmbeddingModelsMap;

export type EmbeddingRouterModelId =
  | {
      [P in EmbeddingProviderId]: `${P}/${EmbeddingModelsMap[P][number]}`;
    }[EmbeddingProviderId]
  | (string & {});
