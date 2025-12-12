---
title: Google Calendar Trigger
---

The Google Calendar trigger polls your calendars for new, updated, cancelled, started, or ended events. VoltOps handles OAuth, token refresh, and polling windows so agents receive fresh event data without webhooks.

For trigger setup and usage instructions, see the [Usage Guide](https://voltagent.dev/docs/triggers/usage/).

**Use Cases**:

- Start agents when meetings are created or rescheduled
- Send reminders when events begin or end
- React to cancellations to free resources or notify attendees
- Filter for specific keywords (e.g., "on-call", "interview") to route tasks

## Setting Credential

Google Calendar triggers use OAuth 2.0.

1. Enable the [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) in your Google Cloud project.
2. In **APIs & Services → Credentials**, create an **OAuth client ID** (type: **Web application**).
3. Add the VoltOps OAuth redirect URL shown in the console as an authorized redirect URI.
4. In VoltOps Console **Step 1 (Connection)**, create a Google Calendar credential and provide the **Client ID** and **Client Secret**, then click **Authorize with Google** to complete the OAuth flow.

VoltOps requests the `https://www.googleapis.com/auth/calendar` scope and automatically refreshes tokens.

## Trigger Configuration

- **Calendar ID**: Calendar to watch. Default: `primary`.
- **Event Type**: Choose one of the supported events below.
- **Search Term (Optional)**: Keyword query sent as `q` to Google Calendar (e.g., `"interview"`).
- **Expand Recurring Events**: When enabled, recurring instances are expanded for started/ended checks.
- **Polling Interval**: How often VoltOps polls. Default 60 seconds; minimum 30 seconds.

## Event Types

- `googlecalendar.eventCreated` — New event created (delivery: Polling)
- `googlecalendar.eventUpdated` — Existing event updated (delivery: Polling)
- `googlecalendar.eventCancelled` — Event cancelled (delivery: Polling)
- `googlecalendar.eventStarted` — Event start time reached (delivery: Polling)
- `googlecalendar.eventEnded` — Event end time reached (delivery: Polling)

## Payload Structure

VoltOps delivers the event with provider metadata:

```json
{
  "provider": "googlecalendar",
  "triggerType": "eventUpdated",
  "calendarId": "primary",
  "matchTerm": "planning",
  "polledAt": "2024-11-14T10:00:00.000Z",
  "eventId": "abcd1234",
  "event": {
    "id": "abcd1234",
    "status": "confirmed",
    "summary": "Product sync",
    "start": { "dateTime": "2024-11-14T10:30:00.000Z", "timeZone": "UTC" },
    "end": { "dateTime": "2024-11-14T11:00:00.000Z", "timeZone": "UTC" },
    "updated": "2024-11-14T09:55:00.000Z",
    "htmlLink": "https://www.google.com/calendar/event?eid=..."
  }
}
```

## Add Target to Activate Binding

After configuring your Google Calendar trigger, add a target (agent or workflow) to activate the binding. For detailed instructions on:

- Adding targets to activate bindings
- Mapping trigger data to agent inputs
- Testing triggers with sample payloads
- Deploying and monitoring triggers

See the [Add Target to Activate Binding section](https://voltagent.dev/docs/triggers/usage/#step-3-add-target-to-activate-binding). These steps are the same for all trigger providers.
