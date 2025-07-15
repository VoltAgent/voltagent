---
title: Overview
slug: /
---

### What is VoltAgent?

Think of VoltAgent as a powerful toolkit for developers who want to build applications with AI smarts. If you've ever wanted to create your own chatbot, a helpful virtual assistant, or any software that needs to think, learn, or interact intelligently, VoltAgent makes it much easier.

Instead of building everything from scratch, VoltAgent provides ready-made building blocks. Here's what makes it special:

- **Core Engine (`@voltagent/core`)**: This is the heart of VoltAgent, providing the fundamental brainpower and capabilities for any AI agent you build.
- **Automate with Workflows**: Go beyond simple chatbots. VoltAgent includes a powerful workflow engine to create multi-step automations that can process data, call APIs, run tasks in parallel, and execute conditional logic.
- **Add Special Features**: Need your AI to talk? Add the `@voltagent/voice` package. It's modular, like adding apps to your phone.
- **Connect to Anything**: VoltAgent helps your AI connect to other websites, tools, or data sources, allowing it to perform real tasks.
- **Memory**: It helps the AI remember past conversations and learn, making interactions more natural and helpful.
- **Works with Many AI Brains**: You're not locked into one AI provider. VoltAgent can work with popular AI models from OpenAI (like ChatGPT), Google, Anthropic, and others.
- **Quick Start Tools (`create-voltagent-app`, `@voltagent/cli`)**: Helpers to get developers up and running with a new AI project quickly.

To easily monitor and manage the agents you build with VoltAgent, there's a complementary tool called **[VoltOps LLM Observability Platform](https://console.voltagent.dev/)** (available separately). It provides a user-friendly interface, bridging the gap between coding flexibility and no-code convenience.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="code" label="Core Framework">

```tsx
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "my-voltagent-app",
  instructions: "A helpful assistant that answers questions without using tools",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});
```

  </TabItem>
  <TabItem value="workflow" label="Workflow Engine">

```typescript
import { createWorkflowChain, andThen, andAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// First, define an agent to be used in the workflow
const agent = new Agent({
  name: "summarizer-agent",
  instructions: "You are an expert at summarizing text.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Then, create the workflow that uses the agent
const analysisWorkflow = createWorkflowChain({
  id: "text-analysis-workflow",
  name: "Text Analysis Workflow",
  input: z.object({ text: z.string() }),
  result: z.object({
    summary: z.string(),
    summaryWordCount: z.number(),
  }),
})
  // Step 1: Prepare the data
  .andThen({
    name: "trim-text",
    execute: async (data) => ({
      trimmedText: data.text.trim(),
    }),
  })
  // Step 2: Call the AI agent for analysis
  .andAgent(
    (data) => `Summarize this text in one sentence: "${data.trimmedText}"`,
    agent, // Uses the agent defined above
    {
      name: "generate-summary",
      schema: z.object({ summary: z.string() }),
    }
  )
  // Step 3: Process the AI's output
  .andThen({
    name: "count-summary-words",
    execute: async (data) => ({
      summary: data.summary,
      summaryWordCount: data.summary.split(" ").length,
    }),
  });
```

  </TabItem>
  <TabItem value="console" label="VoltOps Platform">
![VoltOps LLM Observability Platform](https://cdn.voltagent.dev/readme/demo.gif)
  </TabItem>
</Tabs>

In short, VoltAgent helps developers build sophisticated AI applications faster and more reliably, without getting bogged down in repetitive setup or being limited by overly simple tools.

### Why VoltAgent?

Creating smart AI applications can be tricky. Developers often face two choices:

1.  **Build Everything Themselves:** Using the basic tools provided by AI companies (like OpenAI or Google). This gives lots of control but can quickly become messy, hard to manage, and requires re-building the same features over and over for different projects.
2.  **Use Simple "No-Code" Builders:** These tools are easier to start with but often limit what you can build. You might get stuck with features you can't change, be forced to use only one company's AI, or find it impossible to create truly unique or complex AI assistants.

VoltAgent offers a better way, finding the sweet spot between these two extremes. It provides helpful structure and ready-made components without boxing developers in. Here's why it's a great choice:

- **Build Faster:** Get your AI application up and running much quicker than starting from scratch.
- **Build Sophisticated Automations:** It's not just for chat. The workflow engine lets you build complex, multi-step processes for tasks like data analysis pipelines, automated content generation, or intelligent decision-making systems.
- **Keep Things Tidy:** VoltAgent encourages organized code, making applications easier to update and fix later.
- **Grow Easily:** Start with a simple chatbot and scale up to handle more complex tasks or multiple AI agents working together.
- **Stay Flexible:** You have full control to customize how your AI looks, behaves, and interacts.
- **Avoid Getting Stuck:** VoltAgent doesn't lock you into a specific AI provider. You can switch if needed, protecting your work.
- **Save Costs:** Smart features help reduce how much you spend on using the underlying AI services.
- **Monitor and Debug Visually:** The separate [VoltOps LLM Observability Platform](https://console.voltagent.dev/) provides a visual interface to easily track performance, understand behavior, and fix issues in your VoltAgent applications.

Essentially, VoltAgent helps developers build the exact AI application they imagine – from simple helpers to sophisticated systems – more efficiently and with less frustration, complemented by powerful monitoring tools.
