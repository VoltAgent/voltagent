---
title: Alerts
---

# Alerts

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/voltop-docs/alert.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Alerts notify your team when AI agent metrics exceed defined thresholds. VoltOps evaluates alert conditions every minute and triggers notifications through configured channels.

## Alert Components

An alert consists of:

- **Metric**: What to monitor (error rate, latency)
- **Condition**: Threshold and condition type (count or percent)
- **Time Window**: Evaluation period (5, 15, 30, or 60 minutes)
- **Filters**: Scope the alert to specific traces
- **Channels**: Where to send notifications (webhook, Slack)
- **Cooldown**: Minimum time between notifications

## Creating an Alert

Navigate to the Alerts page in VoltOps and click "Create Alert".

### Selecting a Metric

| Metric       | Description                                             |
| ------------ | ------------------------------------------------------- |
| Errored Runs | Counts traces with `status: error` or `error_count > 0` |
| Latency      | Calculates average trace duration in the time window    |

### Condition Types

For error rate alerts:

- **Count**: Trigger when error count exceeds N runs
- **Percent**: Trigger when error percentage exceeds N%

For latency alerts:

- Trigger when average latency exceeds N seconds

### Time Windows

Available windows: 5, 15, 30, or 60 minutes. The alert evaluates all traces within this rolling window.

### Cooldown Period

After an alert triggers, VoltOps waits for the cooldown period before sending another notification. Available options: 5, 15, 30, 60, or 120 minutes.

## Filters

Filters narrow the scope of an alert to specific traces. Multiple filters are combined with AND logic.

### Available Filter Fields

| Field               | Type   | Operators         | Description                                     |
| ------------------- | ------ | ----------------- | ----------------------------------------------- |
| Status              | select | eq, neq           | Trace status: `error`, `success`, `in_progress` |
| Latency (ms)        | number | gt, lt            | Trace duration in milliseconds                  |
| Model               | text   | eq, neq           | LLM model name                                  |
| User ID             | text   | eq, neq           | User identifier from trace                      |
| Input               | text   | contains          | Trace input content                             |
| Output              | text   | contains          | Trace output content                            |
| Error Message       | text   | eq, contains      | Error message from failed traces                |
| Agent/Workflow Name | text   | eq, neq, contains | Name of the root span                           |
| Entity Type         | select | eq, neq           | `agent` or `workflow`                           |
| Metadata            | text   | eq, neq, contains | Custom metadata key-value pairs                 |

### Filter Operators

| Operator   | Description                           |
| ---------- | ------------------------------------- |
| `eq`       | Equals                                |
| `neq`      | Not equals                            |
| `gt`       | Greater than                          |
| `lt`       | Less than                             |
| `contains` | Contains substring (case-insensitive) |

### Metadata Filters

Filter by custom metadata fields using dot notation:

- `metadata.environment` - Direct metadata key
- `metadata.context.region` - Nested context key

## Notification Channels

### Webhook

Send HTTP POST requests to any URL when an alert triggers.

**Configuration:**

- **URL**: Endpoint to receive the webhook
- **Headers**: Optional HTTP headers (JSON format)
- **Body**: Optional custom payload (JSON format)

**Default Payload:**

```json
{
  "alert_id": "uuid",
  "alert_name": "High Error Rate",
  "metric": "error_rate",
  "value": 15.5,
  "threshold": 10,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Slack

Send notifications to a Slack channel using Incoming Webhooks.

**Setup:**

1. Create an Incoming Webhook in your Slack workspace ([Slack documentation](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/))
2. Copy the webhook URL (format: `https://hooks.slack.com/services/...`)
3. Paste the URL in the Slack channel configuration

Slack notifications include:

- Alert name and metric
- Current value and threshold
- Link to view the incident
- Link to view a sample trace (when available)

### Testing Notifications

Click "Send Test Notification" to verify your channel configuration. Test webhooks include an `is_test: true` field.

## Incidents

When an alert triggers, VoltOps creates an incident. Incidents track the lifecycle of an alert from trigger to resolution.

### Incident Statuses

| Status       | Description                              |
| ------------ | ---------------------------------------- |
| Open         | Alert triggered, awaiting response       |
| Acknowledged | Team member is investigating             |
| Snoozed      | Temporarily muted until a specified time |
| Resolved     | Issue addressed, incident closed         |

### Incident Workflow

1. Alert triggers → Incident created with status `open`
2. Team member takes ownership → Status changes to `acknowledged`
3. Investigation complete → Status changes to `resolved`

Alternatively:

- **Snooze**: Temporarily silence the incident. When the snooze period expires, the incident reopens if conditions still trigger.

### Incident Details

Each incident contains:

- **Payload**: Metric value at trigger time, threshold, and sample trace ID
- **Assignee**: Team member responsible for resolution
- **Notes**: Comments added during investigation
- **Timestamps**: Triggered at, resolved at

## Dashboard

The Alerts dashboard displays:

| Metric           | Description                                        |
| ---------------- | -------------------------------------------------- |
| Total Incidents  | Number of incidents in the selected period         |
| Active Incidents | Currently open, acknowledged, or snoozed incidents |
| Avg Resolve Time | Mean time from trigger to resolution               |
| Sparkline        | Daily incident counts over the period              |

Toggle between 7-day and 30-day views using the period selector.

## Alert Evaluation

VoltOps runs a scheduled job every minute that:

1. Queries traces within each alert's time window
2. Applies the configured filters
3. Calculates the metric value
4. Compares against the threshold
5. Creates an incident if triggered and no open incident exists
6. Sends notifications respecting the cooldown period

If an incident is snoozed and the snooze period expires, the incident reopens and notifications resume.
