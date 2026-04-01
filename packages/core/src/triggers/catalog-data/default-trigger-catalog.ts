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
  {
    triggerId: "google-calendar",
    dslTriggerId: "google-calendar",
    displayName: "Google Calendar",
    service: "GoogleCalendar",
    category: "Productivity",
    authType: "oauth2",
    deliveryModes: ["polling"],
    metadata: {
      description:
        "React to Google Calendar events such as created, updated, started, or cancelled meetings.",
    },
    version: "1.0.0",
    events: [
      {
        key: "googlecalendar.eventCreated",
        displayName: "Event created",
        description:
          "Trigger when a new Google Calendar event is created on the selected calendar.",
        deliveryMode: "polling",
        defaultConfig: {
          provider: {
            type: "googlecalendar",
            calendarId: "primary",
            triggerType: "eventCreated",
            matchTerm: null,
            expandRecurringEvents: false,
            pollIntervalSeconds: 60,
          },
        },
      },
      {
        key: "googlecalendar.eventUpdated",
        displayName: "Event updated",
        description:
          "Trigger when an existing Google Calendar event is updated (title, time, description, etc.).",
        deliveryMode: "polling",
        defaultConfig: {
          provider: {
            type: "googlecalendar",
            calendarId: "primary",
            triggerType: "eventUpdated",
            matchTerm: null,
            expandRecurringEvents: false,
            pollIntervalSeconds: 60,
          },
        },
      },
      {
        key: "googlecalendar.eventCancelled",
        displayName: "Event cancelled",
        description: "Trigger when an event is cancelled on the selected calendar.",
        deliveryMode: "polling",
        defaultConfig: {
          provider: {
            type: "googlecalendar",
            calendarId: "primary",
            triggerType: "eventCancelled",
            matchTerm: null,
            expandRecurringEvents: false,
            pollIntervalSeconds: 60,
          },
        },
      },
      {
        key: "googlecalendar.eventStarted",
        displayName: "Event started",
        description:
          "Trigger when an event start time occurs (includes recurring instances when expanded).",
        deliveryMode: "polling",
        defaultConfig: {
          provider: {
            type: "googlecalendar",
            calendarId: "primary",
            triggerType: "eventStarted",
            matchTerm: null,
            expandRecurringEvents: true,
            pollIntervalSeconds: 60,
          },
        },
      },
      {
        key: "googlecalendar.eventEnded",
        displayName: "Event ended",
        description: "Trigger when an event end time is reached.",
        deliveryMode: "polling",
        defaultConfig: {
          provider: {
            type: "googlecalendar",
            calendarId: "primary",
            triggerType: "eventEnded",
            matchTerm: null,
            expandRecurringEvents: true,
            pollIntervalSeconds: 60,
          },
        },
      },
    ],
  },
  {
    triggerId: "google-drive",
    dslTriggerId: "google-drive",
    displayName: "Google Drive",
    service: "GoogleDrive",
    category: "Storage",
    authType: "oauth2",
    deliveryModes: ["polling"],
    metadata: {
      description:
        "Detect file or folder changes in Google Drive, similar to Activepieces and n8n.",
    },
    version: "1.0.0",
    events: [
      {
        key: "googledrive.fileChanged",
        displayName: "File created or updated",
        description:
          "Trigger when a file in Google Drive is created or updated, optionally filtered by MIME types.",
        deliveryMode: "polling",
        defaultConfig: {
          provider: {
            type: "googledrive",
            triggerType: "fileChanged",
            folderId: null,
            matchMimeTypes: null,
            pollIntervalSeconds: 60,
          },
        },
      },
      {
        key: "googledrive.folderChanged",
        displayName: "Folder content changed",
        description:
          "Trigger when items in a specific folder are added or updated in Google Drive.",
        deliveryMode: "polling",
        defaultConfig: {
          provider: {
            type: "googledrive",
            triggerType: "folderChanged",
            folderId: null,
            matchMimeTypes: null,
            pollIntervalSeconds: 60,
          },
        },
      },
    ],
  },
] as const satisfies readonly DefaultTriggerCatalogEntry[];
