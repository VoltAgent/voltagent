# Discord Actions

Use Discord actions to announce deploys, coordinate incidents, or manage guild resources without
touching the Discord REST API. VoltOps supports bot-token actions for full control plus a lightweight
webhook action for simple notifications.

## Prerequisites

1. Discord application with a bot token. Invite the bot to the guild(s) you plan to use and grant
   permissions for the actions you need (Send Messages, Manage Channels, Manage Roles, Add
   Reactions, etc.).
2. (Optional) Discord incoming webhook URL if you only need to post messages via webhook.
3. A Volt project with API keys (`pk_…`, `sk_…`).
4. Discord credential inside Volt: **Settings → Integrations → Add Credential → Discord**, then pick
   **Bot Token** or **Webhook** and save. Volt generates a `cred_xxx` identifier.
5. (Recommended) Store defaults as environment variables:

```bash
DISCORD_CREDENTIAL_ID=cred_bot_xxx
DISCORD_WEBHOOK_CREDENTIAL_ID=cred_webhook_xxx
DISCORD_DEFAULT_GUILD_ID=123456789012345678
DISCORD_DEFAULT_CHANNEL_ID=123456789012345678
DISCORD_DEFAULT_THREAD_ID=987654321098765432
```

## Available actions

- `discord.sendMessage` / `discord.sendWebhookMessage`
- `discord.deleteMessage`, `discord.getMessage`, `discord.listMessages`
- `discord.reactToMessage`, `discord.removeReaction`
- `discord.createChannel`, `discord.updateChannel`, `discord.deleteChannel`
- `discord.getChannel`, `discord.listChannels`
- `discord.listMembers`
- `discord.addMemberRole`, `discord.removeMemberRole`

Message + channel actions require a bot token; webhook messages only require a webhook credential.

## Running Discord actions from code

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

// Send a rich message with the bot token
await voltops.actions.discord.sendMessage({
  credential: { credentialId: process.env.DISCORD_CREDENTIAL_ID! },
  guildId: process.env.DISCORD_DEFAULT_GUILD_ID!,
  channelId: process.env.DISCORD_DEFAULT_CHANNEL_ID!,
  content: "Deploy finished ✅",
  embeds: [
    {
      title: "Artifact",
      url: "https://example.com/deploy/123",
      description: "Shipped by VoltAgent",
    },
  ],
});

// Send via webhook (no bot token required)
await voltops.actions.discord.sendWebhookMessage({
  credential: { credentialId: process.env.DISCORD_WEBHOOK_CREDENTIAL_ID! },
  content: "New signup from landing page!",
  username: "VoltAgent Bot",
  threadId: process.env.DISCORD_DEFAULT_THREAD_ID ?? undefined,
});

// React to a message
await voltops.actions.discord.reactToMessage({
  credential: { credentialId: process.env.DISCORD_CREDENTIAL_ID! },
  channelId: process.env.DISCORD_DEFAULT_CHANNEL_ID!,
  messageId: "112233445566778899",
  emoji: "eyes",
});

// Assign a role
await voltops.actions.discord.addMemberRole({
  credential: { credentialId: process.env.DISCORD_CREDENTIAL_ID! },
  guildId: process.env.DISCORD_DEFAULT_GUILD_ID!,
  userId: "999888777666555444",
  roleId: "444555666777888999",
});
```

## Treat Discord actions as tools

```ts
import { createTool } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/core";
import { z } from "zod";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

export const sendDiscordUpdate = createTool({
  name: "sendDiscordUpdate",
  description: "Send a Discord message to a channel or thread.",
  parameters: z.object({
    content: z.string().describe("Plain-text body"),
    channelId: z.string().optional(),
    threadId: z.string().optional(),
  }),
  execute: async ({ content, channelId, threadId }) => {
    return await voltops.actions.discord.sendMessage({
      credential: { credentialId: process.env.DISCORD_CREDENTIAL_ID! },
      guildId: process.env.DISCORD_DEFAULT_GUILD_ID!,
      channelId: channelId ?? process.env.DISCORD_DEFAULT_CHANNEL_ID!,
      threadId: threadId ?? undefined,
      content,
    });
  },
});
```

Tools make it easy for an agent to narrate progress, open a new channel for an incident, or react to
messages during planning.

## Testing payloads in the console

- Open **Volt Console → Actions → Add Action** and select the Discord action (bot or webhook).
- Attach the correct credential type. Bot-token actions will also show guild/channel defaults you can
  pre-fill.
- Enter the payload (content, embeds, components, IDs) in **Payload & Test** and run it. Successful
  responses display the raw Discord payload plus an SDK snippet.
- Use console runs to capture message IDs for follow-up reactions, deletes, or replies.

## Troubleshooting

- 403/`Missing Permissions` errors usually mean the bot lacks the required permission (Send Messages,
  Manage Channels/Roles) or is not in the guild.
- Use a webhook credential only for `discord.sendWebhookMessage`; other actions require a bot token.
- Provide `content`, `embeds`, or `components`—Discord rejects empty messages.
- `emoji` should be an emoji name (`thumbsup`) or custom emoji syntax (`name:id`). Colons are
  optional.
- Channel, thread, and guild IDs must all belong to the guild your bot can access; mismatches return
  404 errors.
- Check **Volt → Actions → Runs** for payloads, metadata, and provider error messages when debugging.
