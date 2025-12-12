---
title: Slack Trigger
---

The Slack trigger listens to Events API webhooks so VoltOps can run agents when messages, reactions, or channel activity happen in your workspace. VoltOps automatically handles Slack's URL verification challenge and validates requests with your signing secret.

For trigger setup and usage instructions, see the [Usage Guide](https://voltagent.dev/docs/triggers/usage/).

**Use Cases**:

- Capture app mentions and route them to an agent
- Summarize or triage new channel messages
- React to emoji signals (e.g., :eyes: for review, :white_check_mark: for done)
- Watch file shares to sync documents elsewhere
- Notify when new teammates join or channels get created

## Setting Credential

1. Create a Slack app from [api.slack.com/apps](https://api.slack.com/apps) and choose **From scratch**, then select your workspace.
2. In **OAuth & Permissions**, add bot scopes that cover your events (recommended: `channels:read`, `channels:history`, `groups:history`, `im:history`, `mpim:history`, `reactions:read`, `chat:write`, `files:read`, `files:write`, `users:read`).
3. Install the app to your workspace and copy the **Bot User OAuth Token** (`xoxb-…`).
4. In **Basic Information**, copy the **Signing Secret**. VoltOps uses this to verify Slack signatures.
5. In VoltOps Console **Step 1 (Connection)**, create a Slack credential and provide:
   - **Access Token**: your `xoxb-` bot token
   - **Signing Secret**: recommended for signature verification (can also be set via `SLACK_SIGNING_SECRET` or `SLACK_APP_SIGNING_SECRET`).

## Enable Slack Event Subscriptions

1. In Slack **Features → Event Subscriptions**, toggle **Enable Events** on.
2. Paste the **Request URL** shown in VoltOps when creating the Slack trigger. Slack will send `url_verification`; VoltOps responds automatically.
3. Under **Subscribe to bot events**, add events that match the trigger you choose:
   - `slack.anyEvent`: subscribe to the broad events you want to forward (use sparingly in large workspaces).
   - `slack.appMention`: add `app_mention`.
   - `slack.messagePosted`: add message events (e.g., `message.channels`, `message.groups`, `message.im`, `message.mpim`) for channels/DMs your bot joins.
   - `slack.reactionAdded`: add `reaction_added`.
   - `slack.fileShare`: message events deliver `file_share` subtypes.
   - `slack.filePublic`: add `file_public`.
   - `slack.channelCreated`: add `channel_created`.
   - `slack.teamJoin`: add `team_join`.
4. Save the configuration. Slack will validate the Request URL and begin delivering events to VoltOps.

## Trigger Configuration

- **Event Type**: Choose one of the supported events below.
- **Watch Entire Workspace**: Ingest events from all channels your app can see. Turn off to scope the trigger to a single channel.
- **Channel Filter (Optional)**: Provide a channel ID to only fire when the event occurs in that channel.
- **Include Bot Messages**: When off, bot-authored messages are ignored for `messagePosted`.

## Event Types

- `slack.anyEvent` — Any Events API payload your app receives (delivery: Webhook)
- `slack.appMention` — When your bot is mentioned (delivery: Webhook)
- `slack.messagePosted` — New message in a channel/DM the bot can read (delivery: Webhook)
- `slack.reactionAdded` — Reaction added to a message (delivery: Webhook)
- `slack.fileShare` — Message with file attachments (`file_share` subtype) (delivery: Webhook)
- `slack.filePublic` — File made public in the workspace (delivery: Webhook)
- `slack.channelCreated` — New public channel created (delivery: Webhook)
- `slack.teamJoin` — User joined the workspace (delivery: Webhook)

## Payload Structure

VoltOps sends the Slack `event` object to your target and attaches trigger metadata.

```json
{
  "triggerMetadata": {
    "provider": "slack",
    "triggerKey": "slack.messagePosted",
    "eventType": "message",
    "eventSubtype": null,
    "teamId": "T0123456",
    "eventId": "Ev1234567890",
    "channelId": "C0123456",
    "userId": "U0123456",
    "configuredChannelId": "C0123456"
  },
  "input": {
    "type": "message",
    "channel": "C0123456",
    "text": "Hello from VoltOps!",
    "user": "U0123456",
    "ts": "1731000000.000200"
  }
}
```

## Add Target to Activate Binding

After configuring your Slack trigger, add a target (agent or workflow) to activate the binding. For detailed instructions on:

- Adding targets to activate bindings
- Mapping trigger data to agent inputs
- Testing triggers with sample payloads
- Deploying and monitoring triggers

See the [Add Target to Activate Binding section](https://voltagent.dev/docs/triggers/usage/#step-3-add-target-to-activate-binding). These steps are the same for all trigger providers.
