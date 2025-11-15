import { GITHUB_TRIGGER_EVENTS } from "./github-events";
import { SLACK_TRIGGER_EVENTS } from "./slack-events";

export interface DefaultTriggerCatalogEntry {
  triggerId: string;
  dslTriggerId?: string;
  displayName: string;
  service: string;
  category?: string | null;
  authType?: string | null;
  deliveryModes: string[];
  beta?: boolean;
  defaultVersion?: string | null;
  metadata?: Record<string, unknown> | null;
  version?: string;
  sourceHash?: string | null;
  payloadSchema?: Record<string, unknown> | null;
  configSchema?: Record<string, unknown> | null;
  versionMetadata?: Record<string, unknown> | null;
  events: ReadonlyArray<DefaultTriggerCatalogEvent>;
}

export interface DefaultTriggerCatalogEvent extends Record<string, unknown> {
  key: string;
  displayName: string;
  description: string;
  deliveryMode: string;
  defaultConfig?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export const DEFAULT_TRIGGER_CATALOG = [
  {
    triggerId: "cron",
    displayName: "Cron Trigger",
    service: "Scheduler",
    category: "Platform & General",
    authType: null,
    deliveryModes: ["schedule"],
    metadata: {
      description: "Run an agent or workflow on a recurring schedule using cron expressions.",
    },
    version: "1.0.0",
    events: [
      {
        key: "cron.schedule",
        displayName: "Scheduled run",
        description:
          "Execute on the provided cron expression schedule (e.g., every minute, hourly).",
        deliveryMode: "schedule",
        defaultConfig: {
          schedule: {
            type: "cron",
            expression: "*/5 * * * *",
            timezone: "UTC",
          },
        },
      },
    ],
  },
  {
    triggerId: "gmail-new-email",
    dslTriggerId: "gmail",
    displayName: "Gmail",
    service: "Gmail",
    category: "Email & Messaging",
    authType: "oauth2",
    deliveryModes: ["polling"],
    metadata: {
      description: "Trigger when a new email appears in a selected Gmail inbox or label.",
    },
    version: "1.0.0",
    events: [
      {
        key: "gmail.newEmail",
        displayName: "New email",
        description:
          "Detect new emails in the configured Gmail account and optional label or search filter.",
        deliveryMode: "polling",
      },
    ],
  },
  {
    triggerId: "github",
    displayName: "GitHub",
    service: "GitHub",
    category: "Developer Tools",
    authType: "token",
    deliveryModes: ["webhook"],
    metadata: {
      description:
        "Trigger workflows from GitHub repository activity such as pushes, pull requests, or issue updates.",
      docsUrl:
        "https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads",
    },
    version: "1.0.0",
    events: GITHUB_TRIGGER_EVENTS,
  },
  {
    triggerId: "slack",
    displayName: "Slack",
    service: "Slack",
    category: "Email & Messaging",
    authType: "token",
    deliveryModes: ["webhook"],
    metadata: {
      description:
        "Trigger workflows from events happening inside your Slack workspace such as messages, reactions, and channel activity.",
      docsUrl: "https://api.slack.com/events",
    },
    version: "1.0.0",
    events: SLACK_TRIGGER_EVENTS,
  },
  {
    triggerId: "discord",
    displayName: "Discord (Actions)",
    service: "Discord",
    category: "Email & Messaging",
    authType: "bot-token",
    deliveryModes: [],
    metadata: {
      description:
        "Use Discord bot tokens or webhooks with VoltAgent actions. This integration only powers outgoing actions (no event triggers).",
      actionOnly: true,
    },
    version: "1.0.0",
    events: [],
  },
  {
    triggerId: "airtable-record",
    dslTriggerId: "airtable",
    displayName: "Airtable",
    service: "Airtable",
    category: "Productivity",
    authType: "token",
    deliveryModes: ["polling"],
    metadata: {
      description: "Trigger when new rows are added to an Airtable base or view.",
    },
    version: "1.0.0",
    events: [
      {
        key: "airtable.recordCreated",
        displayName: "Record created",
        description: "Poll the configured Base/Table/View and emit when a new record is created.",
        deliveryMode: "polling",
      },
    ],
  },
] as const satisfies readonly DefaultTriggerCatalogEntry[];
