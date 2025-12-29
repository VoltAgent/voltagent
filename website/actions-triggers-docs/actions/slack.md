# Slack Actions

Slack is where teams triage incidents and coordinate handoffs. VoltOps ships managed Slack actions
so you can post messages, send ephemerals, react to messages, and search history without hand-writing
Slack REST calls.

## Prerequisites

1. Slack app installed with a bot token that has scopes such as `chat:write`, `chat:write.public`,
   `channels:read`, `groups:read`, `im:write`, `users:read`, and `reactions:write`. Invite the bot to
   the channels you plan to use.
2. A Volt project (free or paid) with API keys (`pk_…`, `sk_…`).
3. A Slack credential inside Volt: **Settings → Integrations → Add Credential → Slack**, paste the
   bot token, and save. Volt returns a `cred_xxx` identifier.
4. (Recommended) Store defaults as environment variables:

```bash
SLACK_CREDENTIAL_ID=cred_xxx
SLACK_DEFAULT_CHANNEL_ID=C0123456
SLACK_DEFAULT_THREAD_TS=1720472000.000200
```

## Available actions

- `slack.postMessage` – send to a channel or DM, supports blocks, attachments, link unfurls, and
  threads.
- `slack.postEphemeral` – send an ephemeral message to a user inside a channel.
- `slack.updateMessage` – edit an existing message via `messageTs`.
- `slack.deleteMessage` – delete a message given `channelId` and `messageTs`.
- `slack.getMessagePermalink` – retrieve a permalink for any message.
- `slack.searchMessages` – search Slack messages with sort, channel filters, and limits.
- `slack.addReaction` / `slack.removeReaction` / `slack.getReactions` – manage emoji reactions on a
  message.

The SDK currently ships helpers for `postMessage`, `deleteMessage`, and `searchMessages`; the other
catalog entries are available from the Volt console today and will be exposed through the SDK as
they graduate.

## Running Slack actions from code

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

// Post to a channel (or thread)
await voltops.actions.slack.postMessage({
  credential: { credentialId: process.env.SLACK_CREDENTIAL_ID! },
  channelId: process.env.SLACK_DEFAULT_CHANNEL_ID!,
  text: "Incident resolved ✅",
  threadTs: process.env.SLACK_DEFAULT_THREAD_TS ?? undefined,
  blocks: [
    {
      type: "section",
      text: { type: "mrkdwn", text: "*Latency* back to normal." },
    },
  ],
  linkNames: true,
});

// DM a user by Slack handle and override the credential inline
await voltops.actions.slack.postMessage({
  credential: { accessToken: process.env.SLACK_BOT_TOKEN! },
  targetType: "user",
  userName: "ada",
  text: "Shipping a patch in 10 minutes.",
});

// Delete a message that the bot posted
await voltops.actions.slack.deleteMessage({
  credential: { credentialId: process.env.SLACK_CREDENTIAL_ID! },
  channelId: process.env.SLACK_DEFAULT_CHANNEL_ID!,
  messageTs: "1720472000.000200",
});

// Search the workspace
await voltops.actions.slack.searchMessages({
  credential: { credentialId: process.env.SLACK_CREDENTIAL_ID! },
  query: '"outage" in:C0123456',
  sort: "timestamp",
  limit: 5,
});
```

## Treat Slack actions as tools

```ts
import { createTool } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/core";
import { z } from "zod";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

export const postSlackUpdate = createTool({
  name: "postSlackUpdate",
  description: "Post a Slack message to a channel or DM.",
  parameters: z.object({
    text: z.string(),
    channelId: z.string().optional(),
    userName: z.string().optional(),
    threadTs: z.string().optional(),
  }),
  execute: async ({ text, channelId, userName, threadTs }) => {
    return await voltops.actions.slack.postMessage({
      credential: { credentialId: process.env.SLACK_CREDENTIAL_ID! },
      channelId: channelId ?? process.env.SLACK_DEFAULT_CHANNEL_ID!,
      targetType: userName ? "user" : "conversation",
      userName: userName ?? undefined,
      text,
      threadTs,
      linkNames: true,
    });
  },
});
```

Agents can add the tool to their toolset to post progress updates, DM owners, or attach reactions as
they work through a task.

## Testing payloads in the console

- Open **Volt Console → Actions → Add Action** and pick the Slack action you want to test.
- Attach the Slack credential and choose defaults (channel/user modes, thread timestamp, etc.).
- Use the **Payload & Test** editor to try text, blocks, attachments, or reactions; successful runs
  show the raw Slack response plus a copy-pasteable SDK snippet.
- Use console runs to capture the `messageTs` you need for delete/update/permalink or reaction
  actions.

## Troubleshooting

- `channel_not_found` or `not_in_channel` usually means the bot is not invited to that channel or
  lacks `chat:write` scope.
- DM and ephemeral messages require a `userId` or `userName`; ephemeral also needs the channel ID.
- `messageTs` values come from Slack responses (e.g., `chat.postMessage`); reuse them for delete,
  update, permalink, and reaction actions.
- Blocks and attachments must be arrays; if you paste JSON strings, ensure they parse to arrays.
- Custom reactions should omit colons (use `eyes` or `name:emoji_id`).
- Check **Volt → Actions → Runs** to inspect payloads, metadata, retries, and provider errors.
