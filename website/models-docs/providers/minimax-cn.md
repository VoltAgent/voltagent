---
title: MiniMax (China)
---

# MiniMax (China)

Use `minimax-cn/<model>` with VoltAgent's model router. This provider routes to the China-region endpoint at `https://api.minimaxi.com/v1`.

## Quick start

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "minimax-cn-agent",
  instructions: "You are a helpful assistant",
  model: "minimax-cn/MiniMax-M3",
});
```

## Environment variables

- `MINIMAX_API_KEY`

## Provider package

`@ai-sdk/openai-compatible`

## Default base URL

`https://api.minimaxi.com/v1`

You can override the base URL by setting `MINIMAX_CN_BASE_URL`.

## Provider docs

- https://platform.minimaxi.com/docs/guides/quickstart

## Models

| Model                  | Context   | Description           |
| ---------------------- | --------- | --------------------- |
| MiniMax-M3             | 1M tokens | Latest flagship model |
| MiniMax-M2.7           | 1M tokens | Previous generation   |
| MiniMax-M2.7-highspeed | 1M tokens | Optimized for speed   |
