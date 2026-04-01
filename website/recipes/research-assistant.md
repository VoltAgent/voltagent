---
id: research-assistant
slug: research-assistant
title: AI Research Assistant Agent
description: Learn how to build a multi-agent research workflow with VoltAgent.
repository: https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant
---

<YouTubeEmbed url="https://youtu.be/j6KAUaoZMy4" title="AI Research Assistant Demo" />

In this example, we'll build an AI research assistant agent using VoltAgent's workflow system. We'll create a multi-agent system where different AI agents collaborate to research topics and generate comprehensive reports. This demonstrates the power of workflow orchestration in building AI applications.

You'll create a research workflow that:

- Takes a research topic as input
- Uses an assistant agent to generate search queries
- Leverages a writer agent to create a professional report
- Manages data flow between agents with type safety
- Integrates with external data sources via MCP

## Building the Research Assistant

### Setup

#### Create a new project

```bash
npm create voltagent-app@latest -- --example with-research-assistant
cd my-agent-app
```

You can find the source code of this example [here](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant).

#### Configure environment variables

After signing up for Exa, get your API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

Create a `.env` file:

```env
OPENAI_API_KEY=your-openai-api-key
EXA_API_KEY=your-exa-api-key
```

#### Start the development server

```bash
npm run dev
```

Once your server starts successfully, you'll see the following output in your terminal:

```bash
════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  VoltOps Platform: https://console.voltagent.dev
════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

The [VoltOps Platform](https://console.voltagent.dev) link will open automatically in your browser
where you can interact with your AI agent.

### Complete Code

Here's the complete implementation that we'll break down step by step:

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent, createWorkflowChain } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { z } from "zod";

(async () => {
  const mcpConfig = new MCPConfiguration({
    servers: {
      exa: {
        type: "stdio",
        command: "npx",
        args: ["-y", "mcp-remote", `https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`],
      },
    },
  });

  const assistantAgent = new Agent({
    id: "assistant",
    name: "Assistant",
    instructions:
      "The user will ask you to help generate some search queries. " +
      "Respond with only the suggested queries in plain text " +
      "with no extra formatting, each on its own line. Use exa tools.",
    model: openai("gpt-4o-mini"),
    tools: await mcpConfig.getTools(),
  });

  const writerAgent = new Agent({
    id: "writer",
    name: "Writer",
    instructions: "Write a report according to the user's instructions.",
    model: openai("gpt-4o"),
    tools: await mcpConfig.getTools(),
    markdown: true,
    maxSteps: 50,
  });

  // Define the workflow's shape: its inputs and final output
  const workflow = createWorkflowChain({
    id: "research-assistant",
    name: "Research Assistant Workflow",
    // A detailed description for VoltOps or team clarity
    purpose: "A simple workflow to assist with research on a given topic.",
    input: z.object({ topic: z.string() }),
    result: z.object({ text: z.string() }),
  })
    .andThen({
      id: "research",
      execute: async ({ data }) => {
        const { topic } = data;

        const result = await assistantAgent.generateText(
          `I'm writing a research report on ${topic} and need help coming up with diverse search queries.
          Please generate a list of 3 search queries that would be useful for writing a
          research report on ${topic}. These queries can be in various formats, from simple
          keywords to more complex phrases. Do not add any formatting or numbering to the queries.`,
          { provider: { temperature: 1 } }
        );

        return { text: result.text };
      },
    })
    .andThen({
      id: "writing",
      execute: async ({ data, getStepData }) => {
        const { text } = data;
        const stepData = getStepData("research");
        const result = await writerAgent.generateText(
          `Input Data: ${text}
          Write a two paragraph research report about ${stepData?.input} based on the 
          provided information. Include as many sources as possible. Provide citations 
          in the text using footnote notation ([#]). First provide the report, followed 
          by a single "References" section that lists all the URLs used, in the format [#] <url>.`
        );

        return { text: result.text };
      },
    });

  // Create logger
  const logger = createPinoLogger({
    name: "with-mcp",
    level: "info",
  });

  // Register with VoltOps
  new VoltAgent({
    agents: {
      assistant: assistantAgent,
      writer: writerAgent,
    },
    workflows: {
      assistant: workflow,
    },
    logger,
  });
})();
```

Let's understand each part of this implementation:

#### Step 1: Setting Up MCP Configuration

The first thing we do is configure MCP (Model Context Protocol) to connect with external data sources.
In this case, we're using Exa for research capabilities:

```typescript
const mcpConfig = new MCPConfiguration({
  servers: {
    exa: {
      type: "stdio",
      command: "npx",
      args: ["-y", "mcp-remote", `https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`],
    },
  },
});
```

**What this does:**

- Creates an MCP configuration that connects to Exa's research API
- Uses `stdio` type for communication between processes
- Passes your Exa API key from environment variables
- Makes Exa's search capabilities available as tools for your agents

#### Step 2: Creating the Research Assistant Agent

Next, we create our first agent - the research assistant:

```typescript
const assistantAgent = new Agent({
  id: "assistant",
  name: "Assistant",
  instructions:
    "The user will ask you to help generate some search queries. " +
    "Respond with only the suggested queries in plain text " +
    "with no extra formatting, each on its own line. Use exa tools.",

  model: openai("gpt-4o-mini"),
  tools: await mcpConfig.getTools(),
});
```

**Key components:**

- `id`: Unique identifier for the agent
- `instructions`: Specific instructions for generating search queries in plain text format
- `llm`: Uses Vercel AI SDK for LLM interactions
- `model`: Specifies GPT-4o-mini for cost-effective processing
- `tools`: Inherits all tools from MCP configuration (Exa search capabilities)

#### Step 3: Creating the Writer Agent

The second agent is responsible for writing the final report:

```typescript
const writerAgent = new Agent({
  id: "writer",
  name: "Writer",
  instructions: "Write a report according to the user's instructions.",

  model: openai("gpt-4o"),
  tools: await mcpConfig.getTools(),
  markdown: true,
  maxSteps: 50,
});
```

**Design choices:**

- Uses the more powerful `gpt-4o` model for higher quality writing
- Has specialized instructions for report writing
- `markdown: true` enables markdown formatting in outputs
- `maxSteps: 50` allows for complex multi-step research and writing operations
- Also has access to MCP tools if needed for additional research

#### Step 4: Defining the Workflow Structure

Now we create the workflow chain with input/output schemas:

```typescript
const workflow = createWorkflowChain({
  id: "research-assistant",
  name: "Research Assistant Workflow",
  purpose: "A simple workflow to assist with research on a given topic.",
  input: z.object({ topic: z.string() }),
  result: z.object({ text: z.string() }),
});
```

**Schema definitions:**

- `input`: Expects an object with a `topic` string
- `result`: Will output an object with a `text` string
- Uses Zod for runtime type validation and TypeScript type inference

#### Step 5: Adding the Research Step

The first workflow step generates search queries:

```typescript
.andThen({
  id: "research",
  execute: async ({ data }) => {
    const { topic } = data;

    const result = await assistantAgent.generateText(
      `I'm writing a research report on ${topic} and need help coming up with diverse search queries.
      Please generate a list of 3 search queries that would be useful for writing a
      research report on ${topic}. These queries can be in various formats, from simple
      keywords to more complex phrases. Do not add any formatting or numbering to the queries.`,
      { provider: { temperature: 1 } }
    );

    return { text: result.text };
  },
})
```

**How it works:**

1. Receives the `topic` from the workflow input
2. Uses the assistant agent to generate search queries with temperature set to 1 for more diverse results
3. Returns the queries as `text` for the next step
4. The data automatically flows to the next step in the chain

#### Step 6: Adding the Writing Step

The second step creates the final report:

```typescript
.andThen({
  id: "writing",
  execute: async ({ data, getStepData }) => {
    const { text } = data;
    const stepData = getStepData("research");
    const result = await writerAgent.generateText(
      `Input Data: ${text}
      Write a two paragraph research report about ${stepData?.input} based on the
      provided information. Include as many sources as possible. Provide citations
      in the text using footnote notation ([#]). First provide the report, followed
      by a single "References" section that lists all the URLs used, in the format [#] <url>.`
    );

    return { text: result.text };
  },
})
```

**Advanced features:**

- `data`: Contains the output from the previous step (search queries)
- `getStepData()`: Allows accessing data from any previous step by ID
- `stepData?.input`: Gets the original input data from the research step
- The prompt instructs the agent to include citations and a references section
- Returns the final formatted report text with citations

#### Step 7: Registering with VoltOps

Finally, we register everything with VoltAgent for observability:

```typescript
new VoltAgent({
  agents: {
    assistant: assistantAgent,
    writer: writerAgent,
  },
  workflows: {
    assistant: workflow,
  },
  logger,
});
```

**Benefits:**

- Makes agents and workflows visible in VoltOps Console
- Enables real-time monitoring and debugging
- Provides execution traces for every workflow run
- Allows triggering workflows via REST API

### Running the Workflow

Once everything is set up, you can interact with your research assistant through the VoltOps Console.
Try these example prompts:

- "Research the latest developments in quantum computing"
- "Analyze the impact of AI on healthcare in 2024"
- "Investigate sustainable energy storage solutions"

The workflow will:

1. Generate relevant search queries
2. Use those queries to gather information
3. Synthesize a comprehensive report

### Key Concepts Explained

#### Workflow Chaining

The `.andThen()` method creates a sequential chain where each step's output becomes the next step's input.
This ensures proper data flow and maintains type safety throughout the process.

#### Type Safety with Zod

Every piece of data flowing through the workflow is validated against Zod schemas. This catches errors early
and provides excellent TypeScript integration with full autocomplete support.

#### Step Context Access

The `getStepData()` function is powerful for accessing data from any previous step, not just the immediate
predecessor. This enables complex data dependencies while maintaining clean code structure.

#### Agent Collaboration

By using different agents for different tasks (research vs. writing), we can:

- Optimize model selection per task (cost vs. quality)
- Provide specialized instructions for each role
- Scale different parts of the workflow independently

### Next Steps

Now that you understand the basics, you can:

1. **Enhance the agents**: Add more sophisticated instructions or additional tools
2. **Extend the workflow**: Add steps for fact-checking, formatting, or translation
3. **Add conditional logic**: Use `.andWhen()` to create branching workflows
4. **Implement parallel processing**: Use `.andAll()` to run multiple research queries simultaneously
5. **Add error handling**: Implement retry logic and fallback strategies

### Learn More

- [Workflow Documentation](https://voltagent.dev/docs/workflows/overview/) - Deep dive into workflow concepts
- [MCP Documentation](https://voltagent.dev/docs/getting-started/mcp-docs-server/) - Learn about tool integration
- [VoltAgent Core Documentation](https://voltagent.dev/docs/) - Complete API reference
- [Workflow Steps Guide](https://voltagent.dev/docs/workflows/steps/and-then/) - Explore all available step types
