---
title: Cron Trigger
---

The Cron trigger executes agents or workflows on a recurring schedule using cron expressions. Configure the schedule with standard cron syntax and specify a timezone for execution.

For trigger setup and usage instructions, see the [Usage Guide](https://voltagent.dev/docs/triggers/usage/).

**Use Cases**:

- Scheduled data synchronization between systems
- Periodic health checks and monitoring
- Daily or weekly report generation
- Cleanup and maintenance tasks
- Database backups

## Configuration

The Cron trigger requires only a schedule configuration. No credentials are needed.

1. Navigate to the [VoltOps Triggers page](https://console.voltagent.dev/triggers)
2. Select Cron Trigger as the provider
3. Configure your cron expression and timezone

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/cron/cron-setup.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

### Cron Expression

Enter a standard cron expression to define your schedule. The expression is validated and displays a human-readable description.

A standard cron expression with five fields:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Weekday (0-7, where 0 and 7 are Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Special Characters**:

- `*` - Any value
- `,` - Value list separator
- `-` - Range of values
- `/` - Step values

**Common Presets**:

| Preset           | Expression     |
| ---------------- | -------------- |
| Every 5 minutes  | `*/5 * * * *`  |
| Every 15 minutes | `*/15 * * * *` |
| Every hour       | `0 * * * *`    |
| Every 3 hours    | `0 */3 * * *`  |
| Daily at 9 AM    | `0 9 * * *`    |
| Weekly on Monday | `0 9 * * 1`    |

**More Examples**:

| Expression    | Description                          |
| ------------- | ------------------------------------ |
| `0 0 1 * *`   | First day of every month at midnight |
| `0 0 * * 0`   | Every Sunday at midnight             |
| `30 2 * * *`  | Every day at 2:30 AM                 |
| `0 */6 * * *` | Every 6 hours                        |

For testing cron expressions, use [crontab.guru](https://crontab.guru).

### Timezone

Select the timezone in which the cron expression will execute. Uses standard IANA timezone identifiers.

**Default**: `UTC`

**Common Timezones**:

- `UTC` - Coordinated Universal Time (+0:00)
- `America/New_York` - Eastern (-5:00)
- `America/Los_Angeles` - Pacific (-8:00)
- `Europe/London` - GMT (+0:00)
- `Asia/Tokyo` - JST (+9:00)

## Event Types

Cron triggers support the following event type:

### Scheduled Run

Execute on the provided cron expression schedule (e.g., every minute, hourly).

- **Delivery Method**: Schedule
- **Event ID**: `cron`

## Payload Structure

VoltOps delivers scheduled execution events with the following structure:

```json
{
  "schedule": {
    "type": "cron",
    "expression": "*/5 * * * *",
    "timezone": "UTC"
  },
  "executedAt": "2024-11-14T10:00:00.000Z"
}
```

### Payload Fields

- **schedule.type**: Always `"cron"` for cron triggers
- **schedule.expression**: The cron expression that triggered execution
- **schedule.timezone**: The timezone used for scheduling
- **executedAt**: ISO 8601 timestamp of when the schedule triggered

## Add Target to Activate Binding

After configuring your Cron trigger, you need to add a target (agent or workflow) to activate the binding. For detailed instructions on:

- Adding targets to activate bindings
- Mapping trigger data to agent inputs
- Testing triggers with sample payloads
- Deploying and monitoring triggers

See the [Add Target to Activate Binding section](https://voltagent.dev/docs/triggers/usage/#step-3-add-target-to-activate-binding). These steps are the same for all trigger providers.
