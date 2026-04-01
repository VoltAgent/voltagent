---
title: Chat SDK
description: Integrate VoltAgent with Chat SDK to build Slack bots with webhook routes.
---

# Integrating VoltAgent with Chat SDK

Use Chat SDK for Slack transport (webhooks, thread subscriptions, interactive actions) and VoltAgent for AI reasoning/tool calling.

## Quick Start

```bash
npm create voltagent-app@latest -- --example with-chat-sdk
cd with-chat-sdk
pnpm install
pnpm dev
```

The example exposes a webhook endpoint at `/api/webhooks/slack` and expects:

- `OPENAI_API_KEY`
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `REDIS_URL`

Expose your local webhook with Volt Tunnel:

```bash
pnpm volt tunnel 3000
```

## Minimal Code Example

```ts title="lib/bot.ts"
import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";
import { Chat } from "chat";
import { slackAssistantAgent } from "./agent";

export const bot = new Chat({
  userName: "voltagentbot",
  adapters: {
    slack: createSlackAdapter(),
  },
  state: createRedisState(),
});

bot.onNewMention(async (thread) => {
  await thread.subscribe();
  await thread.post("I am subscribed to this thread. Send a follow-up message.");
});

bot.onSubscribedMessage(async (thread, message) => {
  const input = message.text?.trim();
  if (!input) return;

  const { text } = await slackAssistantAgent.generateText(
    `Respond as a concise teammate.\nMessage: ${input}`
  );

  await thread.post(text || "Could not generate a response.");
});
```

This gives you the core integration pattern: Chat SDK handles Slack transport, VoltAgent handles reasoning.

For a step-by-step setup (Slack manifest, tunnel, webhook config, and testing), see:

- [Slack Agent with Chat SDK](/recipes-and-guides/slack-agent-chat-sdk/)

Full example source:

- [examples/with-chat-sdk](https://github.com/VoltAgent/voltagent/tree/main/examples/with-chat-sdk)
