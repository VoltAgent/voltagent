---
"@voltagent/core": patch
---

feat: extend SubAgent functionality with support for multiple execution methods and flexible configuration API

**SubAgent functionality has been significantly enhanced to support all four agent execution methods (generateText, streamText, generateObject, streamObject) with flexible per-subagent configuration.** Previously, SubAgents only supported `streamText` method. Now you can configure each SubAgent to use different execution methods with custom options and schemas.

## 📋 Usage

**New SubAgent API with createSubagent():**

```typescript
import { Agent, createSubagent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Define schemas for structured output
const analysisSchema = z.object({
  summary: z.string(),
  keyFindings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const reportSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
});

// Create specialized subagents
const dataAnalyst = new Agent({
  name: "DataAnalyst",
  instructions: "Analyze data and provide structured insights",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const reportGenerator = new Agent({
  name: "ReportGenerator",
  instructions: "Generate comprehensive reports",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const summaryWriter = new Agent({
  name: "SummaryWriter",
  instructions: "Create concise summaries",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Supervisor with enhanced SubAgent configuration
const supervisor = new Agent({
  name: "AdvancedSupervisor",
  instructions: "Coordinate specialized agents with different methods",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [
    // ✅ OLD STYLE: Direct agent (defaults to streamText) - still supported
    summaryWriter,

    // ✅ NEW STYLE: generateObject with schema
    createSubagent({
      agent: dataAnalyst,
      method: "generateObject",
      schema: analysisSchema,
      options: {
        temperature: 0.3, // Precise analysis
        maxTokens: 1500,
      },
    }),

    // ✅ NEW STYLE: streamObject with schema
    createSubagent({
      agent: reportGenerator,
      method: "streamObject",
      schema: reportSchema,
      options: {
        temperature: 0.5,
        maxTokens: 2000,
      },
    }),

    // ✅ NEW STYLE: generateText with custom options
    createSubagent({
      agent: summaryWriter,
      method: "generateText",
      options: {
        temperature: 0.7, // Creative writing
        maxTokens: 800,
      },
    }),
  ],
});
```

**Backward Compatibility:**

```typescript
// ✅ OLD STYLE: Still works (defaults to streamText)
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [agent1, agent2, agent3], // Direct Agent instances
  // ... other config
});
```
