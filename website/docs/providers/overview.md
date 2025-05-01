---
title: Providers Overview
slug: /providers/overview
---

# Providers Overview

In VoltAgent, **Providers** (implementing the `LLMProvider` interface) are the essential components that bridge the gap between your `Agent` and the underlying Large Language Models (LLMs) or AI services. They handle the specifics of interacting with different APIs, managing authentication, formatting requests, and parsing responses.

This allows you to build your agent logic independently of the specific LLM service you choose initially, making it easy to switch models or services later.

## Available Providers

VoltAgent offers several built-in providers, each tailored to different services or SDKs:

- **[`@voltagent/vercel-ai`](./vercel-ai.md):**

  - Leverages the versatile [Vercel AI SDK](https://sdk.vercel.ai/docs) for broad compatibility with numerous LLMs (OpenAI, Anthropic, Google, Groq, Cohere, Mistral, etc.).
  - Recommended if you want access to the widest range of models through a single, unified SDK.

- **[`@voltagent/xsai`](./xsai.md):**

  - Uses the lightweight `xsai` library to connect to any OpenAI-compatible API endpoint (including OpenAI, Groq, Together AI, Anyscale, Mistral, local models via Ollama/LM Studio).
  - Ideal for flexibility and when targeting environments sensitive to bundle size (like edge functions).

- **[`@voltagent/google-ai`](./google-ai.md):**

  - Connects directly to Google's Generative AI models (Gemini) using the official `@google/genai` SDK.
  - Supports both Gemini API keys and Vertex AI configurations (server-side only for Vertex).
  - Choose this for dedicated integration with Google's models via their primary SDK.

- **[`@voltagent/groq-ai`](./groq-ai.md):**
  - Uses the `groq-sdk` to interact specifically with the Groq API for high-speed inference on supported models.
  - Choose this when prioritizing the lowest latency responses offered by Groq.

Select the provider that best fits the LLM service or API you intend to use. See the individual provider pages linked above for detailed installation, configuration, and usage instructions.
