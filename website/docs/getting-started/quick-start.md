---
title: Automatic Setup
slug: /quick-start
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ApiKeyButton from '@site/src/components/docs-widgets/ApiKeyButton';
import StepSection from '@site/src/components/docs-widgets/StepSection';
import WorkflowDiagramFlow from '@site/src/components/docs-widgets/WorkflowDiagramFlow';
import SectionDivider from '@site/src/components/docs-widgets/SectionDivider';
import ExpandableCode from '@site/src/components/docs-widgets/ExpandableCode';

# Automatic Setup

Create and run your first AI agent with VoltAgent. You'll set up a project, configure an AI provider, and test your agent with the VoltOps console.

<StepSection stepNumber={1} title="Create New Project">

Run the following command to create a new VoltAgent project:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm create voltagent-app@latest my-agent-app
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn create voltagent-app my-agent-app
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm create voltagent-app my-agent-app
```

  </TabItem>
</Tabs>

The CLI will prompt you for project name, AI provider, and API key. Once complete:

```bash
cd my-agent-app
```

**Requirements:** Node.js 20.19 or newer

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
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ↪ Share it:    pnpm volt tunnel 3141 (secure HTTPS tunnel for teammates)
     Docs: https://voltagent.dev/docs/deployment/local-tunnel/
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

</StepSection>

<StepSection stepNumber={3} title="Test Your Agent">

1. Open [`https://console.voltagent.dev`](https://console.voltagent.dev) and click **Agents & Workflows** in the sidebar to find your agent.
2. Open it, click the chat icon in the bottom right corner, and try asking _"What's the weather in San Francisco?"_

You should receive a response, you've successfully created your first AI agent that understand and generate responses.

![VoltOps LLM Observability Platform](https://cdn.voltagent.dev/readme/demo.gif)

</StepSection>

<SectionDivider>
  Up to this point, you created and tested a basic working AI agent. The next step shows how to connect it to external events and services.
</SectionDivider>

<StepSection stepNumber={4} title="Add Triggers and Actions (Optional)">

You now have a working AI agent that responds to messages. VoltAgent also supports event-driven workflows.

- [VoltAgent Triggers](/docs/triggers/overview/) listen for external events like GitHub webhooks or cron schedules.
- [Voltagent Actions](/docs/actions/overview/) send data to external services like Discord or Slack.

Together, they let your agent react to events and take actions automatically.

The diagram below shows an event-driven agent example: a GitHub star event triggers the agent, which generates a message and sends it to Discord.

<WorkflowDiagramFlow />

**Workflow steps:**

1. **Trigger** - Captures a GitHub star webhook event
2. **AI Agent** - Generates a message based on the event
3. **Action** - Sends the message to Discord

To implement this workflow with your agent, go to the VoltAgent Console [Get Started Guide](https://console.voltagent.dev/get-started) and continue from Step 4.

</StepSection>

## Running Your First Human-in-the-Loop Workflow

Workflows chain multiple steps (data transformations, API calls, AI agent interactions) into a single execution. Unlike a standalone agent that responds to one message at a time, workflows coordinate multi-step processes.

The generated project includes an expense approval workflow that demonstrates **suspend/resume** functionality. Workflows can pause execution, wait for human input, and then continue.

**How it works:**

- Expenses under $500 are auto-approved by the system
- Expenses over $500 suspend and wait for manager approval

<ExpandableCode title="src/workflows/index.ts" previewLines={15}>

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

export const expenseApprovalWorkflow = createWorkflowChain({
  id: "expense-approval",
  name: "Expense Approval Workflow",
  purpose: "Process expense reports with manager approval for high amounts",

  input: z.object({
    employeeId: z.string(),
    amount: z.number(),
    category: z.string(),
    description: z.string(),
  }),
  result: z.object({
    status: z.enum(["approved", "rejected"]),
    approvedBy: z.string(),
    finalAmount: z.number(),
  }),
})
  // Step 1: Validate expense and check if approval needed
  .andThen({
    id: "check-approval-needed",
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
      comments: z.string().optional(),
      adjustedAmount: z.number().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      // If resuming with manager's decision
      if (resumeData) {
        return {
          ...data,
          approved: resumeData.approved,
          approvedBy: resumeData.managerId,
          finalAmount: resumeData.adjustedAmount || data.amount,
        };
      }

      // Expenses over $500 require manager approval
      if (data.amount > 500) {
        await suspend("Manager approval required", {
          employeeId: data.employeeId,
          requestedAmount: data.amount,
          category: data.category,
        });
      }

      // Auto-approve small expenses
      return {
        ...data,
        approved: true,
        approvedBy: "system",
        finalAmount: data.amount,
      };
    },
  })
  // Step 2: Process the final decision
  .andThen({
    id: "process-decision",
    execute: async ({ data }) => {
      return {
        status: data.approved ? "approved" : "rejected",
        approvedBy: data.approvedBy,
        finalAmount: data.finalAmount,
      };
    },
  });
```

</ExpandableCode>

Key concepts:

- **`suspend()`** pauses the workflow and stores its state
- **`resumeData`** contains the input provided when the workflow resumes
- **`resumeSchema`** defines the expected shape of resume data using Zod

### Run the Workflow

Open the [Workflows page](https://console.voltagent.dev/workflows), select **"Expense Approval Workflow"**, and click **"Test Workflow"**. Enter input and click **"Execute Workflow"**.

For automatic approval (under $500):

```json
{
  "employeeId": "EMP-123",
  "amount": 250,
  "category": "office-supplies",
  "description": "New laptop mouse and keyboard"
}
```

For manual review (over $500):

```json
{
  "employeeId": "EMP-456",
  "amount": 750,
  "category": "travel",
  "description": "Flight tickets for client meeting"
}
```

## Additional Features

### Share Your Local Server (Optional)

When you need to demo your agent remotely or receive external webhooks, install the VoltAgent CLI and open a tunnel:

```bash title="Install the CLI (adds a volt script and dev dependency)"
npx @voltagent/cli init
```

Then expose your local server:

```bash
pnpm volt tunnel 3141
```

The command prints an HTTPS URL (for example `https://your-tunnel-address.tunnel.voltagent.dev`) that forwards traffic to your local port until you press `Ctrl+C`. You can also run it ad‑hoc without installing dependencies:

> Tip: skipping the port (`pnpm volt tunnel`) uses the default `3141`.

```bash
npx @voltagent/cli tunnel 3141
```

See the [Local Tunnel guide](/docs/deployment/local-tunnel) for details and limitations.

### Build for Production

When you're ready to deploy, bundle the app and run the compiled JavaScript with Node:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm run build
npm start
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn build
yarn start
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm build
pnpm start
```

  </TabItem>
</Tabs>

The `build` script invokes **tsdown**, which bundles your TypeScript entrypoint (and any sibling directories such as `./workflows` or `./tools`) into `dist/index.js`. This extra step keeps the Node ESM loader from throwing `ERR_UNSUPPORTED_DIR_IMPORT` while preserving extensionless imports during development.

### Run the Example Workflow

The generated project includes an expense approval workflow example. You can run it from the VoltOps console.

This workflow uses the following VoltAgent workflow steps:

- **Data Transformation** (`andThen`)
- **AI Agent Calls** (`andAgent`)
- **Parallel Processing** (`andAll`)
- **Racing Operations** (`andRace`)
- **Conditional Logic** (`andWhen`)

#### How to Run the Workflow

![VoltOps Workflow Observability](https://cdn.voltagent.dev/docs/workflow-observability-demo.gif)

1.  **Go to the Workflows Page:** After starting your server, go directly to the [Workflows page](https://console.voltagent.dev/workflows).
2.  **Select Your Project:** Use the project selector on the page to choose your newly created project (e.g., "my-agent-app").
3.  **Find and Run the Workflow:** You will see **"Expense Approval Workflow"** listed. Click on it to open the detail page, then click the **"Run"** button.
4.  **Provide Input:** An input form will appear. The workflow expects a JSON object with expense details. Try one of the following inputs to see how it works:
    - For automatic approval (under $100):

```json
{
  "amount": 75,
  "category": "office supplies",
  "description": "Notebooks and pens for team meeting"
}
```

    -   For manual review (over $100):

```json
{
  "amount": 450,
  "category": "equipment",
  "description": "New monitor for development workstation"
}
```

5.  **View the Results:** After execution, inspect the logs for each step and see the output in the console.

## Next Steps

- [Tutorial](/tutorial/introduction) - Build agents with tools, memory, and integrations
- [Agent Configuration](../agents/overview.md) - Agent options and settings
- [Memory](../agents/memory/overview.md) - Conversation history and persistence
- [Tools](../agents/tools.md) - Create custom tools for your agent

---

For manual project setup without the CLI, see the [Manual Setup](./manual-setup.md) guide.
