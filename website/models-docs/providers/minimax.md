---
title: MiniMax
---

# MiniMax

Use `minimax/<model>` with VoltAgent's model router.

MiniMax provides an OpenAI-compatible API at `https://api.minimax.io/v1`. For users in China, use the `minimax-cn` provider which routes to `https://api.minimaxi.com/v1`.

## Quick start

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "minimax-agent",
  instructions: "You are a helpful assistant",
  model: "minimax/MiniMax-M3",
});
```

## Environment variables

- `MINIMAX_API_KEY`

## Provider package

`@ai-sdk/openai-compatible`

## Default base URL

`https://api.minimax.io/v1`

You can override the base URL by setting `MINIMAX_BASE_URL`.

## Provider docs

- https://platform.minimax.io/docs/guides/quickstart

## Models

| Model                  | Context   | Description           |
| ---------------------- | --------- | --------------------- |
| MiniMax-M3             | 1M tokens | Latest flagship model |
| MiniMax-M2.7           | 1M tokens | Previous generation   |
| MiniMax-M2.7-highspeed | 1M tokens | Optimized for speed   |
