# Google Calendar Actions

Create, update, search, and delete Calendar events via VoltOps-managed actions—no webhook plumbing or
manual OAuth handling.

## Prerequisites

1. Google Calendar API enabled plus OAuth2 credentials (Volt managed app or your own). Provide
   `accessToken` + `refreshToken` + client ID/secret, or pass a valid short-lived `accessToken`.
2. A Volt project with API keys (`pk_…`, `sk_…`).
3. Google Calendar credential in Volt: **Settings → Integrations → Add Credential → Google
   Calendar**, paste your OAuth values, and copy the returned `cred_xxx`.
4. (Recommended) Environment variables:

```bash
GOOGLE_CALENDAR_CREDENTIAL_ID=cred_xxx
```

## Available actions

- `calendar.createEvent` – create an event with attendees, reminders, locations, and time zones.
- `calendar.updateEvent` – patch an event’s summary, times, attendees, description, status, or
  location.
- `calendar.deleteEvent` – remove an event by `eventId`.
- `calendar.listEvents` – list events for a calendar with time windows, pagination, ordering, and
  query.
- `calendar.getEvent` – fetch a specific event by `eventId`.

## Running Google Calendar actions from code

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

// Create an event on the primary calendar
await voltops.actions.googlecalendar.createEvent({
  credential: { credentialId: process.env.GOOGLE_CALENDAR_CREDENTIAL_ID! },
  calendarId: "primary",
  summary: "Team sync",
  description: "Weekly sync-up with the team",
  location: "Video",
  start: {
    dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    timeZone: "UTC",
  },
  end: {
    dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    timeZone: "UTC",
  },
  attendees: [{ email: "teammate@example.com" }],
});

// Update an existing event
await voltops.actions.googlecalendar.updateEvent({
  credential: { credentialId: process.env.GOOGLE_CALENDAR_CREDENTIAL_ID! },
  calendarId: "primary",
  eventId: "event_123",
  summary: "Updated team sync",
  description: "Add roadmap review",
});

// List upcoming events
const events = await voltops.actions.googlecalendar.listEvents({
  credential: { credentialId: process.env.GOOGLE_CALENDAR_CREDENTIAL_ID! },
  calendarId: "primary",
  timeMin: new Date().toISOString(),
  timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  singleEvents: true,
  orderBy: "startTime",
  maxResults: 10,
});

// Fetch a specific event
await voltops.actions.googlecalendar.getEvent({
  credential: { credentialId: process.env.GOOGLE_CALENDAR_CREDENTIAL_ID! },
  calendarId: "primary",
  eventId: "event_123",
});
```

## Treat Calendar actions as tools

```ts
import { Agent, createTool, VoltOpsClient } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

export const scheduleMeetingTool = createTool({
  name: "scheduleMeeting",
  description: "Create a meeting on the primary Google Calendar.",
  parameters: z.object({
    summary: z.string(),
    description: z.string().optional(),
    start: z.string().describe("ISO date string"),
    end: z.string().describe("ISO date string"),
    attendees: z.array(z.string().email()).optional(),
    timeZone: z.string().optional(),
  }),
  execute: async ({ summary, description, start, end, attendees, timeZone }) => {
    return await voltops.actions.googlecalendar.createEvent({
      credential: { credentialId: process.env.GOOGLE_CALENDAR_CREDENTIAL_ID! },
      calendarId: "primary",
      summary,
      description,
      start: { dateTime: start, timeZone: timeZone ?? "UTC" },
      end: { dateTime: end, timeZone: timeZone ?? "UTC" },
      attendees: attendees?.map((email) => ({ email })),
    });
  },
});

const calendarAgent = new Agent({
  name: "Calendar Assistant",
  model: openai("gpt-4o-mini"),
  instructions: "Use Google Calendar tools to schedule and manage events.",
  tools: [scheduleMeetingTool],
});
```

Agents can now schedule meetings, modify them, or read back details inside reasoning chains.

## Testing payloads in the console

- Open **Volt Console → Actions → Add Action → Google Calendar** and attach your credential.
- Choose an action, enter the payload (`calendarId`, `summary`, `start`, `end`, etc.), and run a test.
- Inspect the request/response plus the SDK snippet shown in **How to use**.

## Troubleshooting

- Auth failures usually mean a missing/expired refresh token or mismatched OAuth client redirect URI;
  re-authorize with offline access.
- Include `timeZone` on `start`/`end` to avoid defaulting to the calendar’s zone.
- Use `calendarId: "primary"` when unsure which calendar the credential owns.
- `listEvents` accepts `timeMin`, `timeMax`, `q`, `singleEvents`, `orderBy`, and pagination via
  `pageToken`.
- Check **Volt → Actions → Runs** for the Google API response if an action fails.
