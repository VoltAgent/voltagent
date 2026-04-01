---
id: slack-agent-chat-sdk
title: Slack Agent with Chat SDK
description: Build a Slack bot with Chat SDK transport and VoltAgent-powered responses.
hide_table_of_contents: true
---

# Slack Agent with Chat SDK

This guide shows how to run a Slack bot using:

- [Chat SDK](https://www.npmjs.com/package/chat) for Slack webhooks, thread subscriptions, and interactive actions
- VoltAgent for AI reasoning and tool calling
- Next.js route handlers for webhook hosting
- Redis for Chat SDK state persistence

:::info
Use the ready-made example: [examples/with-chat-sdk](https://github.com/voltagent/voltagent/tree/main/examples/with-chat-sdk).
:::

## 1. Create the project from example

```bash
npm create voltagent-app@latest -- --example with-chat-sdk
cd with-chat-sdk
pnpm install
```

## 2. Configure environment variables

Copy the env template:

```bash
cp .env.example .env.local
```

Set these values:

```bash
OPENAI_API_KEY=your_openai_api_key
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
REDIS_URL=redis://localhost:6379
```

## 3. Create and configure your Slack app

Open [api.slack.com/apps](https://api.slack.com/apps), create a new app, and use this manifest:

```yaml
display_information:
  name: VoltAgent Chat SDK Bot
  description: Slack bot built with Chat SDK and VoltAgent
features:
  bot_user:
    display_name: VoltAgentBot
    always_online: true
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - channels:read
      - chat:write
      - groups:history
      - groups:read
      - im:history
      - im:read
      - mpim:history
      - mpim:read
      - reactions:read
      - reactions:write
      - users:read
settings:
  event_subscriptions:
    request_url: https://your-domain.com/api/webhooks/slack
    bot_events:
      - app_mention
      - message.channels
      - message.groups
      - message.im
      - message.mpim
  interactivity:
    is_enabled: true
    request_url: https://your-domain.com/api/webhooks/slack
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

Then install the app to your workspace and collect:

- Bot User OAuth Token (`xoxb-...`) -> `SLACK_BOT_TOKEN`
- Signing Secret -> `SLACK_SIGNING_SECRET`

## 4. Run locally and expose webhook URL

Start Next.js:

```bash
pnpm dev
```

Expose local port `3000` with Volt Tunnel:

```bash
pnpm volt tunnel 3000
```

Then update both Slack URLs:

- Event Subscriptions -> Request URL
- Interactivity -> Request URL

Both should point to:

`https://your-tunnel-url/api/webhooks/slack`

## 5. Test the bot

1. Invite the bot to a channel: `/invite @VoltAgentBot`
2. Mention the bot in a channel or thread
3. The bot subscribes to the thread and sends a welcome card
4. Send follow-up messages in that thread and get VoltAgent-generated responses
5. Click the buttons to trigger `hello` and `info` action handlers

## 6. How the example is wired

- `lib/agent.ts`: VoltAgent `Agent` plus `getCurrentTime` tool
- `lib/bot.ts`: Chat SDK adapter setup, mention/subscribed/action handlers
- `app/api/webhooks/[platform]/route.ts`: dynamic webhook route with `waitUntil`

If Slack credentials are missing, the webhook route returns a clear runtime error instead of failing the build.
