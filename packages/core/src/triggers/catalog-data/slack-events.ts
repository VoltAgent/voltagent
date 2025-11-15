import type { DefaultTriggerCatalogEvent } from "./default-trigger-catalog";

export const SLACK_TRIGGER_EVENTS = [
  {
    key: "slack.anyEvent",
    displayName: "Any Slack event",
    description:
      "Receive every event delivered to your Slack app via the Events API. Use with caution in busy workspaces.",
    deliveryMode: "webhook",
    defaultConfig: {
      provider: {
        type: "slack",
        watchWorkspace: true,
        channelId: null,
        includeBotMessages: true,
      },
    },
  },
  {
    key: "slack.appMention",
    displayName: "Bot or app mention",
    description: "Trigger when your bot or app is mentioned in a channel where it is present.",
    deliveryMode: "webhook",
    defaultConfig: {
      provider: {
        type: "slack",
        watchWorkspace: false,
        channelId: null,
        includeBotMessages: false,
      },
    },
  },
  {
    key: "slack.messagePosted",
    displayName: "Message posted to channel",
    description: "Trigger when a new message is posted to a channel that the app is added to.",
    deliveryMode: "webhook",
    defaultConfig: {
      provider: {
        type: "slack",
        watchWorkspace: false,
        channelId: null,
        includeBotMessages: false,
      },
    },
  },
  {
    key: "slack.reactionAdded",
    displayName: "Reaction added",
    description: "Trigger when a reaction is added to a message in a channel your app has joined.",
    deliveryMode: "webhook",
    defaultConfig: {
      provider: {
        type: "slack",
        watchWorkspace: false,
        channelId: null,
        includeBotMessages: true,
      },
    },
  },
  {
    key: "slack.fileShare",
    displayName: "File shared",
    description: "Trigger when a file is shared in a channel that the app is added to.",
    deliveryMode: "webhook",
    defaultConfig: {
      provider: {
        type: "slack",
        watchWorkspace: false,
        channelId: null,
        includeBotMessages: true,
      },
    },
  },
  {
    key: "slack.filePublic",
    displayName: "File made public",
    description: "Trigger when a file is made public in the workspace.",
    deliveryMode: "webhook",
    defaultConfig: {
      provider: {
        type: "slack",
        watchWorkspace: true,
        channelId: null,
        includeBotMessages: true,
      },
    },
  },
  {
    key: "slack.channelCreated",
    displayName: "Channel created",
    description: "Trigger when a new public channel is created in the workspace.",
    deliveryMode: "webhook",
    defaultConfig: {
      provider: {
        type: "slack",
        watchWorkspace: true,
        channelId: null,
        includeBotMessages: true,
      },
    },
  },
  {
    key: "slack.teamJoin",
    displayName: "User joined workspace",
    description: "Trigger when a new user joins the Slack workspace.",
    deliveryMode: "webhook",
    defaultConfig: {
      provider: {
        type: "slack",
        watchWorkspace: true,
        channelId: null,
        includeBotMessages: true,
      },
    },
  },
] as const satisfies readonly DefaultTriggerCatalogEvent[];
