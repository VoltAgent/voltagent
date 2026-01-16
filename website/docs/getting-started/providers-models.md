---
title: Providers & Models
slug: /getting-started/providers-models
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Providers & Models

VoltAgent is built directly on top of the [Vercel AI SDK](https://ai-sdk.dev). You can either:

- Pass a `LanguageModel` from an ai-sdk provider package, or
- Use a model string like `openai/gpt-4o-mini` and let VoltAgent resolve it with the built-in model router.

Both approaches are fully compatible with ai-sdk streaming, tool calling, and structured outputs. For the router, VoltAgent ships with a registry snapshot generated from [models.dev](https://models.dev).

## Model Strings (Model Router)

Model strings remove the need to import provider packages in your app:

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  instructions: "You are a helpful assistant",
  model: "openai/gpt-4o-mini",
});
```

Other examples:

```typescript
const claudeAgent = new Agent({
  name: "claude-agent",
  instructions: "Answer with concise reasoning",
  model: "anthropic/claude-3-5-sonnet",
});

const geminiAgent = new Agent({
  name: "gemini-agent",
  instructions: "Respond in Turkish",
  model: "google/gemini-2.0-flash",
});
```

If you need provider-specific configuration or want to use the ai-sdk APIs directly, pass a `LanguageModel` instead.
See [Model Router & Registry](/docs/getting-started/model-router) for how strings are resolved and how env vars are mapped.
For the full provider directory, see [Models](/models-docs/).

## Installation

Install the AI SDK base package (required):

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash
    npm install ai
    ```

  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add ai
    ```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm add ai
    ```

  </TabItem>
</Tabs>

If you plan to import ai-sdk providers directly (for embeddings or provider-specific helpers like `openai.embedding(...)`), install those packages too. If you only use model strings, you can skip them:

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash
    # For example, to use OpenAI:
    npm install @ai-sdk/openai

    # Or Anthropic:
    npm install @ai-sdk/anthropic

    # Or Google:
    npm install @ai-sdk/google
    ```

  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    # For example, to use OpenAI:
    yarn add @ai-sdk/openai

    # Or Anthropic:
    yarn add @ai-sdk/anthropic

    # Or Google:
    yarn add @ai-sdk/google
    ```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    # For example, to use OpenAI:
    pnpm add @ai-sdk/openai

    # Or Anthropic:
    pnpm add @ai-sdk/anthropic

    # Or Google:
    pnpm add @ai-sdk/google
    ```

  </TabItem>
</Tabs>

If you only use model strings, you can skip installing provider packages.

## Usage Examples

### Model Strings

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  instructions: "You are a helpful assistant",
  model: "openai/gpt-4o-mini",
});
```

### Direct ai-sdk Provider

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "my-agent",
  instructions: "You are a helpful assistant",
  model: openai("gpt-4o-mini"),
});
```

## Available Providers

The lists below describe ai-sdk provider packages. Model strings are resolved through VoltAgent's registry and map to these providers under the hood.

### First-Party AI SDK Providers

These providers are maintained by Vercel and offer the highest level of support and integration:

#### Foundation Models

| Provider                 | Package                 | Documentation                                                              | Key Models                                   |
| ------------------------ | ----------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| **xAI Grok**             | `@ai-sdk/xai`           | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/xai)                  | grok-4, grok-3, grok-2-vision                |
| **OpenAI**               | `@ai-sdk/openai`        | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/openai)               | gpt-4.1, gpt-4o, o3, o1                      |
| **Anthropic**            | `@ai-sdk/anthropic`     | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)            | claude-opus-4, claude-sonnet-4, claude-3.5   |
| **Google Generative AI** | `@ai-sdk/google`        | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) | gemini-2.0-flash, gemini-1.5-pro             |
| **Google Vertex**        | `@ai-sdk/google-vertex` | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex)        | gemini models, claude models via Vertex      |
| **Mistral**              | `@ai-sdk/mistral`       | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/mistral)              | mistral-large, pixtral-large, mistral-medium |

#### Cloud Platforms

| Provider           | Package                  | Documentation                                                        | Description                      |
| ------------------ | ------------------------ | -------------------------------------------------------------------- | -------------------------------- |
| **Amazon Bedrock** | `@ai-sdk/amazon-bedrock` | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock) | Access to various models via AWS |
| **Azure OpenAI**   | `@ai-sdk/azure`          | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/azure)          | OpenAI models via Azure          |
| **Vercel**         | `@ai-sdk/vercel`         | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/vercel)         | v0 model for code generation     |

#### Specialized Providers

| Provider        | Package              | Documentation                                                    | Specialization                     |
| --------------- | -------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| **Groq**        | `@ai-sdk/groq`       | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/groq)       | Ultra-fast inference               |
| **Together.ai** | `@ai-sdk/togetherai` | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/togetherai) | Open-source models                 |
| **Cohere**      | `@ai-sdk/cohere`     | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/cohere)     | Enterprise search & generation     |
| **Fireworks**   | `@ai-sdk/fireworks`  | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/fireworks)  | Fast open-source models            |
| **DeepInfra**   | `@ai-sdk/deepinfra`  | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/deepinfra)  | Affordable inference               |
| **DeepSeek**    | `@ai-sdk/deepseek`   | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/deepseek)   | DeepSeek models including reasoner |
| **Cerebras**    | `@ai-sdk/cerebras`   | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/cerebras)   | Fast Llama models                  |
| **Perplexity**  | `@ai-sdk/perplexity` | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/perplexity) | Search-enhanced responses          |

#### Audio & Speech Providers

| Provider       | Package              | Documentation                                                    | Specialization                     |
| -------------- | -------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| **ElevenLabs** | `@ai-sdk/elevenlabs` | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/elevenlabs) | Text-to-speech                     |
| **LMNT**       | `@ai-sdk/lmnt`       | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/lmnt)       | Voice synthesis                    |
| **Hume**       | `@ai-sdk/hume`       | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/hume)       | Emotional intelligence             |
| **Rev.ai**     | `@ai-sdk/revai`      | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/revai)      | Speech recognition                 |
| **Deepgram**   | `@ai-sdk/deepgram`   | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/deepgram)   | Speech-to-text                     |
| **Gladia**     | `@ai-sdk/gladia`     | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/gladia)     | Audio intelligence                 |
| **AssemblyAI** | `@ai-sdk/assemblyai` | [Docs](https://ai-sdk.dev/providers/ai-sdk-providers/assemblyai) | Speech recognition & understanding |

### Community Providers

These providers are created and maintained by the open-source community:

| Provider                  | Package                            | Documentation                                                                  | Description                        |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------- |
| **Ollama**                | `ollama-ai-provider`               | [Docs](https://ai-sdk.dev/providers/community-providers/ollama)                | Local model execution              |
| **FriendliAI**            | `@friendliai/ai-provider`          | [Docs](https://ai-sdk.dev/providers/community-providers/friendliai)            | Optimized inference                |
| **Portkey**               | `@portkey-ai/vercel-provider`      | [Docs](https://ai-sdk.dev/providers/community-providers/portkey)               | LLM gateway & observability        |
| **Cloudflare Workers AI** | `workers-ai-provider`              | [Docs](https://ai-sdk.dev/providers/community-providers/cloudflare-workers-ai) | Edge AI inference                  |
| **OpenRouter**            | `@openrouter/ai-sdk-provider`      | [Docs](https://ai-sdk.dev/providers/community-providers/openrouter)            | Unified API for multiple providers |
| **Requesty**              | `@requesty/ai-sdk`                 | [Docs](https://ai-sdk.dev/providers/community-providers/requesty)              | Request management                 |
| **Crosshatch**            | `@crosshatch/ai-provider`          | [Docs](https://ai-sdk.dev/providers/community-providers/crosshatch)            | Specialized models                 |
| **Mixedbread**            | `mixedbread-ai-provider`           | [Docs](https://ai-sdk.dev/providers/community-providers/mixedbread)            | Embedding models                   |
| **Voyage AI**             | `voyage-ai-provider`               | [Docs](https://ai-sdk.dev/providers/community-providers/voyage-ai)             | Embedding models                   |
| **Mem0**                  | `@mem0/vercel-ai-provider`         | [Docs](https://ai-sdk.dev/providers/community-providers/mem0)                  | Memory-enhanced AI                 |
| **Letta**                 | `@letta-ai/vercel-ai-sdk-provider` | [Docs](https://ai-sdk.dev/providers/community-providers/letta)                 | Stateful agents                    |
| **Spark**                 | `spark-ai-provider`                | [Docs](https://ai-sdk.dev/providers/community-providers/spark)                 | Chinese language models            |
| **AnthropicVertex**       | `anthropic-vertex-ai`              | [Docs](https://ai-sdk.dev/providers/community-providers/anthropic-vertex-ai)   | Claude via Vertex AI               |
| **LangDB**                | `@langdb/vercel-provider`          | [Docs](https://ai-sdk.dev/providers/community-providers/langdb)                | Database-aware AI                  |
| **Dify**                  | `dify-ai-provider`                 | [Docs](https://ai-sdk.dev/providers/community-providers/dify)                  | LLMOps platform                    |
| **Sarvam**                | `sarvam-ai-provider`               | [Docs](https://ai-sdk.dev/providers/community-providers/sarvam)                | Indian language models             |
| **Claude Code**           | `ai-sdk-provider-claude-code`      | [Docs](https://ai-sdk.dev/providers/community-providers/claude-code)           | Code-optimized Claude              |
| **Built-in AI**           | `built-in-ai`                      | [Docs](https://ai-sdk.dev/providers/community-providers/built-in-ai)           | Browser-native AI                  |
| **Gemini CLI**            | `ai-sdk-provider-gemini-cli`       | [Docs](https://ai-sdk.dev/providers/community-providers/gemini-cli)            | CLI-based Gemini                   |
| **A2A**                   | `a2a-ai-provider`                  | [Docs](https://ai-sdk.dev/providers/community-providers/a2a)                   | Specialized models                 |
| **SAP-AI**                | `@mymediset/sap-ai-provider`       | [Docs](https://ai-sdk.dev/providers/community-providers/sap-ai)                | SAP AI Core integration            |

### OpenAI-Compatible Providers

For providers that follow the OpenAI API specification:

| Provider                      | Documentation                                                             | Description                    |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| **LM Studio**                 | [Docs](https://ai-sdk.dev/providers/openai-compatible-providers/lmstudio) | Local model execution with GUI |
| **Baseten**                   | [Docs](https://ai-sdk.dev/providers/openai-compatible-providers/baseten)  | Model deployment platform      |
| **Any OpenAI-compatible API** | [Docs](https://ai-sdk.dev/providers/openai-compatible-providers)          | Custom endpoints               |

## Model Capabilities

The AI providers support different language models with various capabilities. Here are the capabilities of popular models:

| Provider                 | Model                                       | Image Input | Object Generation | Tool Usage | Tool Streaming |
| ------------------------ | ------------------------------------------- | ----------- | ----------------- | ---------- | -------------- |
| **xAI Grok**             | `grok-4`                                    | ❌          | ✅                | ✅         | ✅             |
| **xAI Grok**             | `grok-3`                                    | ❌          | ✅                | ✅         | ✅             |
| **xAI Grok**             | `grok-3-fast`                               | ❌          | ✅                | ✅         | ✅             |
| **xAI Grok**             | `grok-3-mini`                               | ❌          | ✅                | ✅         | ✅             |
| **xAI Grok**             | `grok-3-mini-fast`                          | ❌          | ✅                | ✅         | ✅             |
| **xAI Grok**             | `grok-2-1212`                               | ❌          | ✅                | ✅         | ✅             |
| **xAI Grok**             | `grok-2-vision-1212`                        | ✅          | ✅                | ✅         | ✅             |
| **xAI Grok**             | `grok-beta`                                 | ❌          | ✅                | ✅         | ✅             |
| **xAI Grok**             | `grok-vision-beta`                          | ✅          | ❌                | ❌         | ❌             |
| **Vercel**               | `v0-1.0-md`                                 | ✅          | ✅                | ✅         | ✅             |
| **OpenAI**               | `gpt-4.1`                                   | ✅          | ✅                | ✅         | ✅             |
| **OpenAI**               | `gpt-4.1-mini`                              | ✅          | ✅                | ✅         | ✅             |
| **OpenAI**               | `gpt-4.1-nano`                              | ✅          | ✅                | ✅         | ✅             |
| **OpenAI**               | `gpt-4o`                                    | ✅          | ✅                | ✅         | ✅             |
| **OpenAI**               | `gpt-4o-mini`                               | ✅          | ✅                | ✅         | ✅             |
| **OpenAI**               | `gpt-4`                                     | ❌          | ✅                | ✅         | ✅             |
| **OpenAI**               | `o3-mini`                                   | ❌          | ❌                | ✅         | ✅             |
| **OpenAI**               | `o3`                                        | ❌          | ❌                | ✅         | ✅             |
| **OpenAI**               | `o4-mini`                                   | ❌          | ❌                | ✅         | ✅             |
| **OpenAI**               | `o1`                                        | ✅          | ❌                | ✅         | ✅             |
| **OpenAI**               | `o1-mini`                                   | ✅          | ❌                | ✅         | ✅             |
| **OpenAI**               | `o1-preview`                                | ❌          | ❌                | ❌         | ❌             |
| **Anthropic**            | `claude-opus-4-20250514`                    | ✅          | ✅                | ✅         | ✅             |
| **Anthropic**            | `claude-sonnet-4-20250514`                  | ✅          | ✅                | ✅         | ✅             |
| **Anthropic**            | `claude-3-7-sonnet-20250219`                | ✅          | ✅                | ✅         | ✅             |
| **Anthropic**            | `claude-3-5-sonnet-20241022`                | ✅          | ✅                | ✅         | ✅             |
| **Anthropic**            | `claude-3-5-sonnet-20240620`                | ✅          | ✅                | ✅         | ✅             |
| **Anthropic**            | `claude-3-5-haiku-20241022`                 | ✅          | ✅                | ✅         | ✅             |
| **Mistral**              | `pixtral-large-latest`                      | ✅          | ✅                | ✅         | ✅             |
| **Mistral**              | `mistral-large-latest`                      | ❌          | ✅                | ✅         | ✅             |
| **Mistral**              | `mistral-medium-latest`                     | ❌          | ✅                | ✅         | ✅             |
| **Mistral**              | `mistral-medium-2505`                       | ❌          | ✅                | ✅         | ✅             |
| **Mistral**              | `mistral-small-latest`                      | ❌          | ✅                | ✅         | ✅             |
| **Mistral**              | `pixtral-12b-2409`                          | ✅          | ✅                | ✅         | ✅             |
| **Google Generative AI** | `gemini-2.0-flash-exp`                      | ✅          | ✅                | ✅         | ✅             |
| **Google Generative AI** | `gemini-1.5-flash`                          | ✅          | ✅                | ✅         | ✅             |
| **Google Generative AI** | `gemini-1.5-pro`                            | ✅          | ✅                | ✅         | ✅             |
| **Google Vertex**        | `gemini-2.0-flash-exp`                      | ✅          | ✅                | ✅         | ✅             |
| **Google Vertex**        | `gemini-1.5-flash`                          | ✅          | ✅                | ✅         | ✅             |
| **Google Vertex**        | `gemini-1.5-pro`                            | ✅          | ✅                | ✅         | ✅             |
| **DeepSeek**             | `deepseek-chat`                             | ❌          | ✅                | ✅         | ✅             |
| **DeepSeek**             | `deepseek-reasoner`                         | ❌          | ❌                | ❌         | ❌             |
| **Cerebras**             | `llama3.1-8b`                               | ❌          | ✅                | ✅         | ✅             |
| **Cerebras**             | `llama3.1-70b`                              | ❌          | ✅                | ✅         | ✅             |
| **Cerebras**             | `llama3.3-70b`                              | ❌          | ✅                | ✅         | ✅             |
| **Groq**                 | `meta-llama/llama-4-scout-17b-16e-instruct` | ✅          | ✅                | ✅         | ✅             |
| **Groq**                 | `llama-3.3-70b-versatile`                   | ❌          | ✅                | ✅         | ✅             |
| **Groq**                 | `llama-3.1-8b-instant`                      | ❌          | ✅                | ✅         | ✅             |
| **Groq**                 | `mixtral-8x7b-32768`                        | ❌          | ✅                | ✅         | ✅             |
| **Groq**                 | `gemma2-9b-it`                              | ❌          | ✅                | ✅         | ✅             |

> **Note:** This table is not exhaustive. Additional models can be found in the provider documentation pages and on the provider websites.

## Migration from Deprecated Providers

If you're currently using VoltAgent's native providers (`@voltagent/anthropic-ai`, `@voltagent/google-ai`, `@voltagent/groq-ai`), we recommend migrating to the Vercel AI SDK providers:

### Before (Deprecated):

```typescript
import { AnthropicProvider } from "@voltagent/anthropic-ai";

const provider = new AnthropicProvider({ apiKey: "..." });
const agent = new Agent({
  llm: provider,
  model: "claude-opus-4-1",
});
```

### After (Recommended):

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  model: "anthropic/claude-3-5-sonnet",
  instructions: "You are a helpful assistant",
});
```

## Environment Variables

Most providers use environment variables for API keys:

```bash
# OpenAI
OPENAI_API_KEY=your-key

# Anthropic
ANTHROPIC_API_KEY=your-key

# Google
GOOGLE_GENERATIVE_AI_API_KEY=your-key

# Groq
GROQ_API_KEY=your-key

# And so on...
```

OpenAI-compatible providers may also need a base URL. You can set a provider-specific override like:

```bash
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

## Next Steps

1. Choose a provider based on your needs (performance, cost, capabilities)
2. Install the corresponding package if you plan to import the provider
3. Configure your API keys
4. Start building with VoltAgent!

For detailed information about each provider, visit the [Vercel AI SDK documentation](https://ai-sdk.dev/docs/foundations/providers-and-models).

---

## Acknowledgments

> The provider lists and model capabilities in this documentation are sourced from the [Vercel AI SDK documentation](https://ai-sdk.dev/docs/foundations/providers-and-models).
>
> **A special thanks to the Vercel AI SDK maintainers and community** for creating and maintaining this comprehensive ecosystem of AI providers. Their work enables developers to seamlessly integrate with 30+ AI providers through a unified, well-designed interface.
>
> VoltAgent builds upon this excellent foundation to provide a complete framework for building AI agents and workflows.
