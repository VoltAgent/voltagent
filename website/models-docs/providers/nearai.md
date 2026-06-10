---
title: NEAR AI Cloud
---

# NEAR AI Cloud

Use `nearai/<model>` with VoltAgent's model router.

NEAR AI Cloud provides OpenAI-compatible TEE inference at `https://cloud-api.near.ai/v1`.

## Quick start

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "nearai-agent",
  instructions: "You are a helpful assistant",
  model: "nearai/zai-org/GLM-5.1-FP8",
});
```

## Environment variables

- `NEARAI_API_KEY`

## Provider package

`@ai-sdk/openai-compatible`

This provider uses the OpenAI-compatible adapter.

## Default base URL

`https://cloud-api.near.ai/v1`

You can override the base URL by setting `NEARAI_BASE_URL`.

## Provider docs

- https://docs.near.ai/

## Models

<details>
  <summary>Show models (33)</summary>

- Qwen/Qwen3-30B-A3B-Instruct-2507
- Qwen/Qwen3-Embedding-0.6B
- Qwen/Qwen3-Reranker-0.6B
- Qwen/Qwen3-VL-30B-A3B-Instruct
- Qwen/Qwen3.5-122B-A10B
- anthropic/claude-haiku-4-5
- anthropic/claude-opus-4-6
- anthropic/claude-opus-4-7
- anthropic/claude-sonnet-4-5
- anthropic/claude-sonnet-4-6
- black-forest-labs/FLUX.2-klein-4B
- google/gemini-2.5-flash
- google/gemini-2.5-flash-lite
- google/gemini-2.5-pro
- google/gemini-3.1-flash-lite
- openai/gpt-4.1
- openai/gpt-4.1-mini
- openai/gpt-4.1-nano
- openai/gpt-5
- openai/gpt-5-mini
- openai/gpt-5-nano
- openai/gpt-5.1
- openai/gpt-5.2
- openai/gpt-5.4
- openai/gpt-5.4-mini
- openai/gpt-5.4-nano
- openai/gpt-5.5
- openai/gpt-oss-120b
- openai/o3
- openai/o3-mini
- openai/o4-mini
- openai/whisper-large-v3
- zai-org/GLM-5.1-FP8

</details>
