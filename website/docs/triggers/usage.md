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

After pasting the token, click **Save credentials** proceed to trigger options.

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

## Step 3: Add Target to Activate Binding

After creating your binding, you need to add targets that will execute when the trigger fires. Targets are the agents or workflows hosted on a server that will process the trigger events.

Click **Add Your First Target** to open the target configuration modal with three tabs: **Target**, **Mapping**, and **Review**.

### Target

We'll configure the server and destination here.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/step-4-1.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

- **Agent Server**: First, click **+ New** to add a new server to host your agents and workflows. This opens the **Create Agent Server** modal with the following fields:
  - **Server Name**: Name for your server
    → Example: `Production server`
  - **URL**: Your server URL where agents are hosted
    → In this example, we're running locally via Volt Tunnel: `https://your-tunnel-address.tunnel.voltagent.dev`

Click **Create Server** to save and select the server you just created.

:::tip Running locally?
Open a secure tunnel with the VoltAgent CLI:

```bash
pnpm volt tunnel 3141
```

This prints an HTTPS forwarding URL (e.g., `https://your-tunnel-address.tunnel.voltagent.dev`). Use that value as the server URL. You can omit the `3141` argument to use the default port. [Learn more](https://voltagent.dev/docs/deployment/local-tunnel/).
:::

- **Select an Agent**: Choose the agent or workflow you want to trigger from your available agents.

Click **Next** to proceed to the Mapping tab.

### Mapping

The Mapping tab is where you transform the Airtable trigger payload into the format your agent expects. This involves capturing sample data from Airtable and mapping it to your agent's input structure.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/step-4-2.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

The mapping flow has 3 steps:

##### **1. Capture Sample Data**

To create the mapping, you first need to capture a live payload from Airtable.

Click **Start Test Session**. The system will start listening for Airtable event with a countdown timer.

:::tip Now trigger your Airtable:

1. Go to your Airtable base
2. Add a new record to the table you configured
3. The system automatically captures the payload
   :::

Once captured, you'll see **Sample Captured** with a green checkmark. The **Captured Payload** section displays the data structure:

```json
{
  "provider": "airtable",
  "record": {
    "id": "rec7Nyu70ri1UNIz",
    "createdTime": "2025-10-31T12:52:29.000Z",
    "fields": {
      "Label": "Test Trigger",
      "Created": "2025-10-31T12:52:29.000Z"
    },
    "pollAtAt": "2025-10-31T12:53:00.629Z"
  }
}
```

#### **2. Map Fields to Agent Input**

Now you'll map the captured Airtable data to your agent's expected input format.

**Captured Payload** - Shows the Airtable record data you just captured

**Mapping Template** - Shows your agent's input structure

:::tip How to map fields

Click on any property in the Captured Payload (left side), and it will insert `{{ path }}` into the mapping template at your cursor position.

For example, clicking on `"Label": "Test Trigger"` in the captured payload inserts `{{record.fields.Label}}` into your template.

```json
{
  "input": {
    "labelValue": "{{ input.record.fields.Label }}"
  }
}
```

:::

#### **3. Preview and Test**

Now you can preview and test your mapping configuration.

**Preview** - Review the final transformed payload based on your captured sample data and mapping template.

**Test** - Click **Send Test Request** to send the mapped payload to your agent. The system will execute your agent and display the response.

If the test succeeds, your mapping is ready to use.

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
