# VoltAgent + Chat SDK (Slack) Example

This example shows how to combine:

- Chat SDK for Slack transport, webhook handling, and thread subscriptions
- VoltAgent for response generation and tool calling
- Redis for thread state persistence

## Try Example

```bash
npm create voltagent-app@latest -- --example with-chat-sdk
```

## Prerequisites

- Node.js 20+
- pnpm
- A Slack workspace where you can install apps
- Redis instance

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set:

- `OPENAI_API_KEY`
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `REDIS_URL`

## 3. Create Slack app

Use this manifest on <https://api.slack.com/apps>:

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
  socket_mode_enabled: false
  token_rotation_enabled: false
```

Replace `https://your-domain.com/api/webhooks/slack` with your real URL.

## 4. Run locally

```bash
pnpm dev
```

Expose port `3000` with Volt Tunnel:

```bash
pnpm volt tunnel 3000
```

Use the generated HTTPS URL in Slack app settings for both request URLs:

- Event Subscriptions -> Request URL
- Interactivity -> Request URL

Both should point to:

`https://your-tunnel-url/api/webhooks/slack`

## 5. Test

1. Invite bot to a channel: `/invite @VoltAgentBot`
2. Mention the bot in a thread or channel
3. Bot subscribes to the thread and starts responding to follow-up messages

## Project Structure

```text
examples/with-chat-sdk/
├── app/
│   └── api/webhooks/[platform]/route.ts  # Chat SDK webhook endpoint
├── lib/
│   ├── agent.ts                          # VoltAgent agent + tools
│   └── bot.ts                            # Chat SDK bot wiring
└── README.md
```
