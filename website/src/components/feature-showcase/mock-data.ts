export interface TabData {
  id: string;
  label: string;
  icon: string;
  code?: string;
  description?: string;
  features?: string[];
  fullImage?: boolean;
}

export const tabsData: TabData[] = [
  {
    id: "framework",
    label: "Framework",
    icon: "code",
    code: `import { VoltAgent, Agent, createTriggers } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Step 1: Create the Slack Agent
const slackAgent = new Agent({
  name: "slack-agent",
  description: "A helpful Slack assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  markdown: true,
});

// Step 2: Set up VoltAgent with Triggers
new VoltAgent({
  agents: { slackAgent },
  triggers: createTriggers((on) => {
    // Step 3: Handle incoming Slack messages
    on.slack.messagePosted(async ({ payload, agents }) => {
      const { channel, thread_ts, ts, text } = payload;

      // Step 4: Generate AI response
      const response = await agents.slackAgent.generateText(
        \`Channel: \${channel}, Message: \${text}\`
      );

      // Step 5: Send reply back to Slack
      await voltOps.actions.slack.postMessage({
        channelId: channel,
        text: response,
        threadTs: thread_ts ?? ts,
      });
    });
  }),
});`,
  },
  {
    id: "observability",
    label: "Observability",
    icon: "chart",
    fullImage: true,
  },
  {
    id: "evals",
    label: "Evals",
    icon: "check",
    code: `import { Agent } from "@voltagent/core";
import { createModerationScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "support-agent",
  instructions: "Answer customer questions about products.",
  model: openai("gpt-4o"),

  // Configure live evaluations
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
      helpfulness: {
        scorer: createHelpfulnessScorer(),
      },
      accuracy: {
        scorer: createAccuracyScorer(),
      },
    },
  },
});`,
  },
  {
    id: "triggers",
    label: "Triggers",
    icon: "zap",
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
  },
  {
    id: "actions",
    label: "Actions",
    icon: "play",
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
  },
  {
    id: "monitoring",
    label: "Monitoring",
    icon: "bell",
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
  },
  {
    id: "prompts",
    label: "Prompts",
    icon: "message",
    code: `import { VoltOps } from "@voltagent/voltops";

const voltOps = new VoltOps();

// Create a managed prompt
const prompt = await voltOps.prompts.create({
  name: "customer-support",
  template: \`You are a helpful customer support agent.

Customer: {{customer_name}}
Issue: {{issue_description}}

Respond professionally and helpfully.\`,
  variables: ["customer_name", "issue_description"],
});

// Use the prompt in your agent
const response = await agent.generateText(
  await voltOps.prompts.render("customer-support", {
    customer_name: "John Doe",
    issue_description: "Can't login to my account",
  })
);`,
  },
  {
    id: "guardrails",
    label: "Guardrails",
    icon: "shield",
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
  },
];
