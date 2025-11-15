# Usage

This guide walks through creating a **trigger using Airtable** that automatically executes your agent when new records are added to your Airtable base. The same workflow applies to other providers (Slack, Gmail, GitHub, Schedule).

:::tip To try this yourself
You'll need [VoltOps Console](https://console.voltagent.dev/) access, a VoltAgent [example](https://voltagent.dev/examples/) or your own agent, and an [Airtable](https://airtable.com/) account with a base and Personal Access Token (we'll show you how to create one).
:::

## Step 1: Trigger Connection

To set up a trigger, you first need to select a provider and configure its credentials.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/step-1-connection.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

In [VoltOps Triggers page](https://console.voltagent.dev/triggers), click **Add Trigger**, select Airtable provider, choose **`Record created`** event, and click **New credential** to configure authentication.

- **Connection Name**: Name for this credential ("Airtable credential")

- **Authentication**: Select **Personal access token** (OAuth 2.0 is also supported)

- **Access Token**: Go to [Airtable Token Creation](https://airtable.com/create/tokens) and create a new token with the following scopes:

```
data.records:read
data.records:write
schema.bases:read
```

After pasting the token, click **Save credentials** to proceed to trigger options.

## Step 2: Trigger Configuration

After configuring credentials, you need to specify which Airtable base, table, and field to monitor for new records. These settings determine when and how the trigger fires.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/step-2-configuration.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Set the following trigger options based on your Airtable base structure:

- **Base**: Select your Airtable base
  → `AI Model Experiment Tracker`

- **Table**: Select the table to monitor for new records
  → `Experiments`

- **View**: (Optional) Select a specific view to monitor

- **Trigger Field**: Select the field that indicates when a record was created
  → `createdTime`

- **Poll Interval**: Set how often to check for new records (in seconds)
  → `60` (lower values increase API usage)

Click **Next** to review your settings, then create the binding with **Draft** status. Next, we'll need to add targets next to activate it.

## Step 3: Choose Where Events Should Go

Configure targets in the single **Delivery** section—no mapping UI or manual transforms required. VoltOps forwards the raw event payload exactly as shown in the Console preview, and your VoltAgent instance receives it under the matching trigger group.

### Option A — VoltAgent Server (default)

1. Select one of your registered VoltAgent servers (or click **+ New** to register one).
2. The endpoint path auto-fills with the expected route for the trigger (e.g., `/triggers/github/star`). Leave it as-is unless you’ve customized your server.
3. Pick the HTTP method (POST is the default) and add optional headers if needed.

### Option B — Volt Tunnel

Running locally? Choose **Volt Tunnel** instead of a server. The UI lists every active tunnel in your organization, so you can forward events to `https://<subdomain>.tunnel.voltagent.dev` without copying URLs around. The same default path logic applies.

:::tip Open a tunnel in one command

```bash
pnpm volt tunnel 3141
```

This gives you a secure HTTPS URL such as `https://happy-cat-42.tunnel.voltagent.dev`. Use it as the delivery target. [More details](https://voltagent.dev/docs/deployment/local-tunnel/).
:::

### Option C — Custom HTTPS URL

If you want to hit a third-party webhook, select **Custom URL** and paste any HTTPS endpoint. VoltOps handles retries and timeout limits for you.

### Mapping & handler DX

Trigger handlers are pure functions that receive the raw event data and metadata. Use the `createTriggers` helper to register handlers via dot-access syntax:

```ts
import { VoltAgent, createTriggers } from "@voltagent/core";

new VoltAgent({
  // ...
  triggers: createTriggers((on) => {
    on.airtable.recordCreated(async ({ payload, event, headers, trigger }) => {
      console.log("New record data:", payload);
      console.log("Full event envelope:", event);
      console.log("HTTP headers:", headers);
      console.log("Trigger metadata:", trigger);

      // Optionally customize the HTTP response (defaults to 200 + { success: true })
      return {
        status: 202,
        body: { received: true },
      };
    });
  }),
});
```

Whenever VoltOps sends an event to your server or tunnel, the handler runs with the exact payload you inspected during trigger setup—no additional mapping code required.

## Step 4: Activate Binding and Test

Now that your binding and target are configured, you can activate the trigger and test it with real data from Airtable. We'll verify the trigger execution by checking the agent's activity in VoltOps Console.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/final-step.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Test the trigger by adding a new record in your Airtable base:

1. Open your Airtable base and add a new record to the monitored table
2. Fill in the trigger field (e.g., `Label` field) and wait for the poll interval to pass

Go back to VoltOps Console and navigate to the **Agents** section from the sidebar. Click on the agent you connected to the trigger to view executions that were processed by the trigger.

You'll see a chart showing trigger execution history. We can use the **Triggers** and **Add Trigger** buttons to manage and add new triggers to this agent.
