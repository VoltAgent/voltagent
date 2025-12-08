export interface TabData {
  id: string;
  label: string;
  icon: string;
  image?: string;
  code?: string;
  description?: string;
  features?: string[];
  fullImage?: boolean;
  footerText?: string;
  docLink?: string;
}

export const tabsData: TabData[] = [
  {
    id: "framework",
    label: "Framework",
    icon: "code",
    image: "https://cdn.voltagent.dev/website/feature-showcase/framework.png",
    code: `import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTriggers } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { weatherTool } from "./tools/weather";

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

      await agents.slackAgent.generateText(
        \`Slack channel: \${channelId}\\n\` +
        \`Thread: \${threadTs ?? "new thread"}\\n\` +
        \`User: <@\${userId}>\\n\` +
        \`Message: \${text}\\n\` +
        \`If the user asks for weather, call getWeather.\`
      );
    });
  }),
});`,
    footerText: "Build AI agents with a type-safe, modular TypeScript framework",
    docLink: "/docs",
  },
  {
    id: "observability",
    label: "Observability",
    icon: "chart",
    image: "https://cdn.voltagent.dev/website/feature-showcase/dashboard.png",
    fullImage: true,
    footerText: "Monitor and debug your AI agents with real-time observability",
    docLink: "/voltops-llm-observability-docs",
  },
  {
    id: "evals",
    label: "Evals",
    icon: "check",
    image: "https://cdn.voltagent.dev/website/feature-showcase/evals.png",
    code: `import { Agent, VoltAgentObservability } from "@voltagent/core";
import { createModerationScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const observability = new VoltAgentObservability();

const agent = new Agent({
  name: "support-agent",
  instructions: "Answer customer questions about products.",
  model: openai("gpt-4o"),
  eval: {
    triggerSource: "production",
    environment: "prod-us-east",
    sampling: { type: "ratio", rate: 0.1 },
    scorers: {
      moderation: {
        scorer: createModerationScorer({
          model: openai("gpt-4o-mini"),
          threshold: 0.5,
        }),
      },
    },
  },
});`,
    footerText: "Evaluate agent responses with customizable scorers in production",
    docLink: "/docs/evals/overview",
  },
  {
    id: "triggers",
    label: "Triggers",
    icon: "zap",
    image: "https://cdn.voltagent.dev/website/feature-showcase/trigger.png",
    code: `import { VoltAgent, createTriggers } from "@voltagent/core";

new VoltAgent({
  triggers: createTriggers((on) => {
    // Slack integration
    on.slack.messagePosted(({ payload, agents }) => {
      console.log("New Slack message:", payload);
    });

    // Airtable integration
    on.airtable.recordCreated(({ payload, agents }) => {
      console.log("New Airtable record:", payload);
    });

    // GitHub integration
    on.github.issueOpened(({ payload, agents }) => {
      console.log("New GitHub issue:", payload);
    });

    // Webhook integration
    on.webhook.received(({ payload, agents }) => {
      console.log("Webhook received:", payload);
    });
  }),
});`,
    footerText: "React to events from Slack, GitHub, Airtable, and webhooks automatically",
    docLink: "/docs/triggers/overview",
  },
  {
    id: "actions",
    label: "Actions",
    icon: "play",
    image: "https://cdn.voltagent.dev/website/feature-showcase/actions.png",
    code: `import { Agent, createTool } from "@voltagent/core";
import { voltOps } from "@voltagent/voltops";

// Create Airtable action as a tool
const createAirtableRecord = createTool({
  name: "createAirtableRecord",
  description: "Create a new record in Airtable",
  parameters: z.object({
    tableName: z.string(),
    fields: z.record(z.any()),
  }),
  execute: async ({ tableName, fields }) => {
    return voltOps.actions.airtable.createRecord({
      baseId: process.env.AIRTABLE_BASE_ID,
      tableName,
      fields,
    });
  },
});

const agent = new Agent({
  name: "data-agent",
  tools: [createAirtableRecord],
});`,
    footerText: "Execute actions on external services like Airtable, Slack, and more",
    docLink: "/docs/actions/overview",
  },
  {
    id: "monitoring",
    label: "Monitoring",
    icon: "bell",
    image: "https://cdn.voltagent.dev/website/feature-showcase/monitoring.png",
    code: `import { VoltOps } from "@voltagent/voltops";

const voltOps = new VoltOps();

// Create an alert for high latency
await voltOps.alerts.create({
  name: "High Latency Alert",
  condition: {
    metric: "latency",
    operator: "gt",
    threshold: 5000, // 5 seconds
  },
  channels: ["slack", "email"],
  severity: "warning",
});

// Create an alert for errors
await voltOps.alerts.create({
  name: "Error Rate Alert",
  condition: {
    metric: "error_rate",
    operator: "gt",
    threshold: 0.05, // 5% error rate
  },
  channels: ["pagerduty"],
  severity: "critical",
});`,
    footerText: "Set up alerts for latency, errors, and custom metrics",
    docLink: "/docs/quick-start",
  },
  {
    id: "prompts",
    label: "Prompts",
    icon: "message",
    image: "https://cdn.voltagent.dev/website/feature-showcase/prompts.png",
    code: `import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const agent = new Agent({
  name: "MyAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "test",
    });
  },
});

new VoltAgent({
  agents: { agent },
  voltOpsClient: voltOpsClient,
});`,
    footerText: "Manage and version prompts centrally with VoltOps",
    docLink: "/docs/agents/prompts#voltops-prompt-management",
  },
  {
    id: "guardrails",
    label: "Guardrails",
    icon: "shield",
    image: "https://cdn.voltagent.dev/website/feature-showcase/guardrails.png",
    code: `import { Agent, createGuardrail } from "@voltagent/core";
import {
  contentModerationGuardrail,
  piiDetectionGuardrail,
  topicRestrictionGuardrail,
} from "@voltagent/guardrails";

const agent = new Agent({
  name: "safe-agent",

  guardrails: {
    input: [
      // Block harmful content
      contentModerationGuardrail({
        categories: ["hate", "violence", "self-harm"],
        threshold: 0.7,
      }),

      // Detect and mask PII
      piiDetectionGuardrail({
        mask: true,
        types: ["email", "phone", "ssn"],
      }),
    ],

    output: [
      // Restrict topics
      topicRestrictionGuardrail({
        blocked: ["competitor-mentions", "pricing"],
      }),
    ],
  },
});`,
    footerText:
      "Protect your agents with content moderation, PII detection, and topic restrictions",
    docLink: "/docs/guardrails/overview",
  },
  {
    id: "deployment",
    label: "Deployment",
    icon: "zap",
    image: "https://cdn.voltagent.dev/website/feature-showcase/deployment.png",
    fullImage: true,
    footerText: "Deploy your agents to production with one command",
    docLink: "/docs/deployment/overview",
  },
];
