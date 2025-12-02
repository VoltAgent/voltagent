# Usage

This guide walks through creating a **trigger using Airtable** that executes your agent when new records are added to your Airtable base. The same workflow applies to other providers (Slack, Gmail, GitHub, Schedule).

:::tip To try this yourself
You'll need [VoltOps Console](https://console.voltagent.dev/) access, a VoltAgent [example](https://voltagent.dev/examples/) or your own agent, and an [Airtable](https://airtable.com/) account with a base and Personal Access Token (we'll show you how to create one).
:::

## Step 1: Trigger Connection

To set up a trigger, you first need to select a provider and configure its credentials.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

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

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

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

After creating your binding, you need to add targets that will execute when the trigger fires. Click **Add Your First Target** to open the target configuration wizard.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/setup-target.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

The target configuration is a **2-step process**:

### Step 3.1: Add Trigger Handler to Your Project

First, you need to add a trigger handler to your VoltAgent project. This is the code that will process incoming trigger events.

The wizard displays a **code snippet** that you need to copy and add to your VoltAgent project:

```typescript
import { VoltAgent, createTriggers } from "@voltagent/core";

new VoltAgent({
  //
  triggers: createTriggers((on) => {
    on.airtable.recordCreated(({ payload }) => {
      console.log(payload);
    });
  }),
});
```

**What this code does:**

- Creates a new VoltAgent instance with trigger handlers
- Uses `createTriggers` to define trigger event handlers
- `on.airtable.recordCreated` registers a handler for the Airtable record created event
- Receives the trigger payload (Airtable record data) when the event fires

**Default endpoint path:** Based on your trigger configuration, the system generates an endpoint path like:

```
POST /triggers/airtable/recordCreated
```

VoltAgent creates this route when you add the trigger handler to your agent. The trigger sends HTTP requests to this endpoint when events occur.

:::tip Important
After adding the snippet to your project:

1. Ensure your VoltAgent server is running
2. Check the **"I've added the snippet to my project"** checkbox
3. Click **Continue** to proceed to delivery configuration
   :::

### Step 3.2: Configure Delivery Target

After adding the trigger handler code, configure how the trigger will deliver events to your endpoint.

#### General

- **Target Name**: A descriptive name for this target
  → Example: `Airtable trigger handler`

#### Delivery

- **Destination**

  Choose where VoltOps should send trigger events. You have three options:
  - **Agent Servers**

    Registered servers appear here with their name and URL. Select a server to send trigger events to it.

    To register a new server, click **Create Agent Server** and provide:
    - **Name**: A name for your server (e.g., `Production server`)
    - **URL**: The root URL of your VoltAgent server (e.g., `https://your-deployed-voltagent-server.com`)
    - **Tags** (optional): Organize your servers with tags

    :::tip
    For local development, see the **Volt Tunnels** section below to expose your local server.
    :::

  - **Volt Tunnels**

    [Volt Tunnels](https://voltagent.dev/docs/deployment/local-tunnel/) expose your local development server to the internet via a secure HTTPS connection. Use this to test triggers against your local VoltAgent instance without deploying to a remote server.

    This section shows your active local tunnels. If you don't have an active tunnel yet, click **Start Local Tunnel** to open a setup modal.

    The modal displays the command you need to run in your terminal. Once you run the command, the modal enters a waiting state with a loading indicator.

    ```bash
    pnpm volt tunnel 3141
    ```

    This gives you a secure HTTPS URL such as `https://happy-cat-42.tunnel.voltagent.dev`. Use it as the delivery target.

    :::note
    When your tunnel becomes active, it appears in the destination dropdown. Core+ users receive permanent tunnel URLs with custom usernames, while free tier users get random temporary URLs.
    :::

  - **Custom HTTPS URL**

    Select **Custom HTTPS URL** to send trigger events to your own webhook endpoint.

    **HTTPS URL**: Enter the URL where you want to receive trigger events (e.g., `https://your-webhook.endpoint`). VoltOps forwards the trigger payload to this address with retries and error tracking enabled.

    **HTTP method**: Choose the HTTP method for the request. Select POST (default), PUT, or PATCH depending on your webhook endpoint requirements.

    After selecting a destination, configure the endpoint path where your trigger handler is registered.

##### **Endpoint Path**

Specify the path where VoltAgent listens for this trigger:

- **Default**: `/triggers/airtable/recordCreated` (generated based on provider and event)
- You can change this if your handler uses a different path

:::tip
VoltAgent listens on this route when you add the trigger handler to your agent configuration. Keep it unless you've customized your server routing.
:::

:::note **Test Connection**

After configuring your delivery destination and endpoint path, click **Test Connection** to verify your endpoint is accessible.

**Possible results:**

- **Endpoint is responding correctly**: Your endpoint is ready to receive triggers
- **404 Not Found**: The endpoint doesn't exist. Verify you've added the trigger handler to your VoltAgent project
- **Connection failed**: The request failed with an error message. Ensure your VoltAgent server is running and accessible
  :::

##### **Delivery Preview**

Below the test connection area, you'll see a preview of the final delivery configuration showing the complete URL and HTTP method that VoltOps will use to send trigger events:

```
POST {destination-url}{endpoint-path}
```

For example: `POST http://localhost:3141/triggers/airtable/recordCreated`

Verify this matches your expected endpoint before saving.

#### Advanced (Optional)

Click **Advanced** to add custom HTTP headers to trigger requests:

- **Header Name**: Custom header key (e.g., `X-API-Key`)
- **Header Value**: Custom header value (e.g., `your-secret-key`)

Use this to add authentication headers or other custom metadata to trigger requests.

After configuring all settings, click **Create target** to save the delivery target. Your binding is now ready to activate!

## Step 4: Activate Binding and Test

Now that your binding and target are configured, you can activate the trigger and test it with real data from Airtable. We'll verify the trigger execution by checking the agent's activity in VoltOps Console.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

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
