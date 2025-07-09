---
"@voltagent/core": patch
---

feat: add Workflow support (alpha)

**🧪 ALPHA FEATURE: Workflow orchestration system is now available for early testing.** This feature allows you to create complex, multi-step agent workflows with chaining API and conditional branching. The API is experimental and may change in future releases.

## 📋 Usage

**Basic Workflow Chain Creation:**

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createWorkflowChain } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

// Create workflow agents
const analyzerAgent = new Agent({
  name: "DataAnalyzer",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "Analyze input data and extract key insights with confidence scores",
});

const processorAgent = new Agent({
  name: "DataProcessor",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "Process and transform analyzed data into structured format",
});

const reporterAgent = new Agent({
  name: "ReportGenerator",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "Generate comprehensive reports from processed data",
});

// Create workflow chain
const dataProcessingWorkflow = createWorkflowChain({
  id: "data-processing-workflow",
  name: "Data Processing Pipeline",
  purpose: "Analyze, process, and generate reports from raw data",
  input: z.object({
    rawData: z.string(),
    analysisType: z.string(),
  }),
  result: z.object({
    originalData: z.string(),
    analysisResults: z.object({
      insights: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
    processedData: z.object({
      summary: z.string(),
      keyPoints: z.array(z.string()),
    }),
    finalReport: z.string(),
    processingTime: z.number(),
  }),
})
  .andAgent(
    async (data) => {
      return `Analyze the following data: ${data.rawData}. Focus on ${data.analysisType} analysis.`;
    },
    analyzerAgent,
    {
      schema: z.object({
        insights: z.array(z.string()),
        confidence: z.number().min(0).max(1),
      }),
    }
  )
  .andThen({
    execute: async (data, state) => {
      // Skip processing if confidence is too low
      if (data.confidence < 0.5) {
        throw new Error(`Analysis confidence too low: ${data.confidence}`);
      }
      return {
        analysisResults: data,
        originalData: state.input.rawData,
      };
    },
  })
  .andAgent(
    async (data, state) => {
      return `Process these insights: ${JSON.stringify(data.analysisResults.insights)}`;
    },
    processorAgent,
    {
      schema: z.object({
        summary: z.string(),
        keyPoints: z.array(z.string()),
      }),
    }
  )
  .andAgent(
    async (data, state) => {
      return `Generate a final report based on: ${JSON.stringify(data)}`;
    },
    reporterAgent,
    {
      schema: z.object({
        finalReport: z.string(),
      }),
    }
  )
  .andThen({
    execute: async (data, state) => {
      return {
        ...data,
        processingTime: Date.now() - state.startAt.getTime(),
      };
    },
  });

// Execute workflow
const result = await dataProcessingWorkflow.run({
  rawData: "User input data...",
  analysisType: "sentiment",
});

console.log(result.analysisResults); // Analysis results
console.log(result.finalReport); // Generated report
```

**Conditional Logic Example:**

```typescript
const conditionalWorkflow = createWorkflowChain({
  id: "conditional-workflow",
  name: "Smart Processing Pipeline",
  purpose: "Process data based on complexity level",
  input: z.object({
    data: z.string(),
  }),
  result: z.object({
    complexity: z.string(),
    processedData: z.string(),
    processingMethod: z.string(),
  }),
})
  .andAgent(
    async (data) => {
      return `Analyze complexity of: ${data.data}`;
    },
    validatorAgent,
    {
      schema: z.object({
        complexity: z.enum(["low", "medium", "high"]),
      }),
    }
  )
  .andThen({
    execute: async (data, state) => {
      // Route to different processing based on complexity
      if (data.complexity === "low") {
        return { ...data, processingMethod: "simple" };
      } else {
        return { ...data, processingMethod: "advanced" };
      }
    },
  })
  .andAgent(
    async (data, state) => {
      if (data.processingMethod === "simple") {
        return `Simple processing for: ${state.input.data}`;
      } else {
        return `Advanced processing for: ${state.input.data}`;
      }
    },
    data.processingMethod === "simple" ? simpleProcessor : advancedProcessor,
    {
      schema: z.object({
        processedData: z.string(),
      }),
    }
  );
```

**⚠️ Alpha Limitations:**

- **NOT READY FOR PRODUCTION** - This is an experimental feature
- Visual flow UI integration is in development
- Error handling and recovery mechanisms are basic
- Performance optimizations pending
- **API may change significantly** based on community feedback
- Limited documentation and examples

**🤝 Help Shape Workflows:**
We need your feedback to make Workflows awesome! The API will evolve based on real-world usage and community input.

- 💬 **[Join our Discord](https://s.voltagent.dev/discord)**: Share ideas, discuss use cases, and get help
- 🐛 **[GitHub Issues](https://github.com/VoltAgent/voltagent/issues)**: Report bugs, request features, or suggest improvements
- 🚀 **Early Adopters**: Build experimental projects and share your learnings
- 📝 **API Feedback**: Tell us what's missing, confusing, or could be better

**🔄 Future Plans:**

- React Flow integration for visual workflow editor
- Advanced error handling and retry mechanisms
- Workflow templates and presets
- Real-time execution monitoring
- Comprehensive documentation and tutorials
