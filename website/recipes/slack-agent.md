---
id: slack-agent
title: Slack Agent
description: Listen to Slack channel messages, process them with AI, and reply via VoltOps.
hide_table_of_contents: true
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ApiKeyButton from '@site/src/components/docs-widgets/ApiKeyButton';
import StepSection from '@site/src/components/docs-widgets/StepSection';
import SectionDivider from '@site/src/components/docs-widgets/SectionDivider';
import ExpandableCode from '@site/src/components/docs-widgets/ExpandableCode';

# Slack Agent

This guide shows how to build event-driven AI agents with VoltAgent and Slack using [Triggers](/actions-triggers-docs/triggers/usage) and [Actions](/actions-triggers-docs/actions/overview).

You'll create an agent that uses Triggers to receive Slack messages, processes them (with optional weather lookup), and uses Actions to reply in the same channel.

:::info
Follow the steps with your own keys and workspace. You can get the agent source code [here](https://github.com/voltagent/voltagent/tree/main/examples/with-slack).
:::

<br/>

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-5.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

<StepSection stepNumber={1} title="Create the Project">

Run the CLI to scaffold a new project:

```bash
npm create voltagent-app@latest
```

</StepSection>

<StepSection stepNumber={2} title="Configure and Start">

If you skipped API key entry during setup, create or edit the `.env` file in your project root and add your API key:

<Tabs>
  <TabItem value="openai" label="OpenAI" default>

```bash
OPENAI_API_KEY=your-api-key-here
```

<ApiKeyButton provider="OpenAI" href="https://platform.openai.com/api-keys" />

  </TabItem>
  <TabItem value="anthropic" label="Anthropic">

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Anthropic" href="https://console.anthropic.com/settings/keys" />

  </TabItem>
  <TabItem value="google" label="Google Gemini">

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Google" href="https://aistudio.google.com/app/apikey" />

  </TabItem>
  <TabItem value="groq" label="Groq">

```bash
GROQ_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Groq" href="https://console.groq.com/keys" />

  </TabItem>
  <TabItem value="mistral" label="Mistral">

```bash
MISTRAL_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Mistral" href="https://console.mistral.ai/api-keys" />

  </TabItem>
</Tabs>

Now start the development server:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm run dev
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn dev
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm dev
```

  </TabItem>
</Tabs>

You should see the VoltAgent server startup message:

```bash
═══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
═══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ↪ Share it:    pnpm volt tunnel 3141 (secure HTTPS tunnel for teammates)
     Docs: https://voltagent.dev/deployment-docs/local-tunnel/
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
═══════════════════════════════════════════════════
```

</StepSection>

<StepSection stepNumber={3} title="Set Up the Slack Trigger in Console">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-1.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Open [VoltAgent Console](https://console.voltagent.dev/triggers) and go to **Triggers** → **Create Trigger**.

1. Select **Slack → Message posted to channel**
2. Use the managed Slack app when prompted
3. Create a Slack credential and save the `credentialId`

</StepSection>

<StepSection stepNumber={4} title="Expose Your Local Agent with Volt Tunnel">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-2.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

[Volt Tunnel](/deployment-docs/local-tunnel/) exposes your local server to the internet so triggers can reach it.

Run the tunnel command:

```bash
pnpm volt tunnel 3141
```

Copy the tunnel URL (e.g., `https://your-tunnel.tunnel.voltagent.dev`) and set it as the **Endpoint URL** in the trigger configuration.

</StepSection>

<SectionDivider>
  The project is set up and the Slack trigger is configured. The following steps cover wiring the trigger to your agent and adding the reply action.
</SectionDivider>

<StepSection stepNumber={5} title="Wire the Slack Trigger to Your Agent">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-3.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

This code sets up a trigger handler that receives Slack messages and can call a weather tool. The reply tool is added in the next step.

<ExpandableCode title="src/index.ts" previewLines={15}>

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTriggers } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { weatherTool } from "./tools/weather";

type SlackMessagePayload = {
  channel?: string;
  thread_ts?: string;
  ts?: string;
  text?: string;
  user?: string;
};

const logger = createPinoLogger({ name: "with-slack", level: "info" });

const slackAgent = new Agent({
  name: "slack-agent",
  instructions: "You are a Slack assistant.",
  tools: [weatherTool],
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { slackAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.slack.messagePosted(async ({ payload, agents }) => {
      const event = (payload as SlackMessagePayload | undefined) ?? {};
      const channelId = event.channel;
      const threadTs = event.thread_ts ?? event.ts;
      const text = event.text ?? "";
      const userId = event.user ?? "unknown-user";

      if (!channelId || !text) {
        logger.warn("Missing channel or text in Slack payload");
        return;
      }

      await agents.slackAgent.generateText(`Slack channel: ${channelId}
Thread: ${threadTs ?? "new thread"}
User: <@${userId}>
Message: ${text}
If the user asks for weather, call getWeather.`);
    });
  }),
});
```

</ExpandableCode>

<ExpandableCode title="src/tools/weather.ts" previewLines={10}>

```ts
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherOutputSchema = z.object({
  weather: z.object({
    location: z.string(),
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number(),
    windSpeed: z.number(),
  }),
  message: z.string(),
});

export const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("City or location to get weather for (e.g., San Francisco)"),
  }),
  outputSchema: weatherOutputSchema,
  execute: async ({ location }) => {
    // Mocked weather data for demo purposes; replace with a real API if desired.
    const mockWeatherData = {
      location,
      temperature: Math.floor(Math.random() * 30) + 5,
      condition: ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"][
        Math.floor(Math.random() * 5)
      ],
      humidity: Math.floor(Math.random() * 60) + 30,
      windSpeed: Math.floor(Math.random() * 30),
    };

    return {
      weather: mockWeatherData,
      message: `Current weather in ${location}: ${mockWeatherData.temperature}°C and ${mockWeatherData.condition.toLowerCase()} with ${mockWeatherData.humidity}% humidity and wind speed of ${mockWeatherData.windSpeed} km/h.`,
    };
  },
});
```

</ExpandableCode>

</StepSection>

<StepSection stepNumber={6} title="Add the Slack Action and Reply Tool">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-4.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Open [VoltAgent Console](https://console.voltagent.dev/actions) and go to **Actions** → **Create Action**.

1. Select **Slack** and the same credential
2. Save the action

Add the VoltOps client and `sendSlackMessage` tool to your code:

<ExpandableCode title="src/index.ts" previewLines={15}>

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool, createTriggers } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/sdk";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";
import { weatherTool } from "./tools/weather";

type SlackMessagePayload = {
  channel?: string;
  thread_ts?: string;
  ts?: string;
  text?: string;
  user?: string;
};

const logger = createPinoLogger({ name: "with-slack", level: "info" });

const voltOps = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY ?? "",
  secretKey: process.env.VOLTAGENT_SECRET_KEY ?? "",
});

const sendSlackMessage = createTool({
  name: "sendSlackMessage",
  description: "Send a message to a Slack channel or thread.",
  parameters: z.object({
    channelId: z.string(),
    text: z.string(),
    threadTs: z.string().optional(),
  }),
  execute: async ({ channelId, text, threadTs }) => {
    const credentialId = process.env.SLACK_CREDENTIAL_ID;
    if (!credentialId) {
      throw new Error("SLACK_CREDENTIAL_ID is not set");
    }
    return voltOps.actions.slack.postMessage({
      credential: { credentialId },
      channelId,
      text,
      threadTs,
      linkNames: true,
    });
  },
});

const slackAgent = new Agent({
  name: "slack-agent",
  instructions: [
    "You are a Slack assistant.",
    "Use sendSlackMessage to reply in the same channel/thread.",
    "Use getWeather for weather questions.",
  ].join(" "),
  tools: [weatherTool, sendSlackMessage],
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { slackAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.slack.messagePosted(async ({ payload, agents }) => {
      const event = (payload as SlackMessagePayload | undefined) ?? {};
      const channelId = event.channel;
      const threadTs = event.thread_ts ?? event.ts;
      const text = event.text ?? "";
      const userId = event.user ?? "unknown-user";

      if (!channelId || !text) {
        logger.warn("Missing channel or text in Slack payload");
        return;
      }

      await agents.slackAgent.generateText(`Slack channel: ${channelId}
Thread: ${threadTs ?? "new thread"}
User: <@${userId}>
Message: ${text}
Respond in Slack via sendSlackMessage; use getWeather for weather questions.`);
    });
  }),
});
```

</ExpandableCode>

</StepSection>

<StepSection stepNumber={7} title="Test End-to-End">

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/voltagent-recipes-guides/slack-5.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Now test the complete flow from Slack to your agent and back.

Add these environment variables to your `.env` file:

```bash
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
SLACK_CREDENTIAL_ID=cred_...
```

With the tunnel and server running:

1. Mention the bot or post a message in the channel
2. The trigger sends the event to your agent
3. The agent processes the message (calls `getWeather` if asked)
4. The agent replies via `sendSlackMessage`

View request/response logs in **Actions → Runs** in Console.

:::tip

- Shared Slack app Request URL: https://api.voltagent.dev/hooks/slack (or your host).
- Invite the bot to the channel (/invite @your-bot).
- Keep VOLTAGENT_PUBLIC_KEY, VOLTAGENT_SECRET_KEY, and SLACK_CREDENTIAL_ID in .env.
- Use Volt Tunnel locally; switch to your deployed URL later.
  :::

</StepSection>

## Related Documentation

- [Triggers Usage](/actions-triggers-docs/triggers/usage) - Trigger configuration reference
- [Tools](/docs/agents/tools) - Creating agent tools
