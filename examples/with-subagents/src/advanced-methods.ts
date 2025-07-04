import { VoltAgent, Agent, createTool, createSubagent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create a simple tool for data processing
const calculateTool = createTool({
  name: "calculate",
  description: "Performs basic mathematical calculations",
  parameters: z.object({
    expression: z.string().describe("Mathematical expression to calculate (e.g., '2 + 3 * 4')"),
  }),
  execute: async ({ expression }: { expression: string }) => {
    try {
      // Simple evaluation (in real apps, use a proper math parser)
      const result = eval(expression);
      return { result: `${expression} = ${result}` };
    } catch (error) {
      return { error: "Invalid mathematical expression" };
    }
  },
});

// Schema for data analysis results
const analysisResultSchema = z.object({
  summary: z.string().describe("Brief summary of the analysis"),
  keyFindings: z.array(z.string()).describe("Key findings from the analysis"),
  recommendations: z.array(z.string()).describe("Recommended actions"),
  confidence: z.number().min(0).max(1).describe("Confidence level (0-1)"),
});

// Schema for report generation
const reportSchema = z.object({
  title: z.string().describe("Report title"),
  executive_summary: z.string().describe("Executive summary"),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("Section heading"),
        content: z.string().describe("Section content"),
        priority: z.enum(["high", "medium", "low"]).describe("Section priority"),
      }),
    )
    .describe("Report sections"),
  created_at: z.string().describe("Report creation timestamp"),
});

// Create specialized subagents
const dataAnalystAgent = new Agent({
  name: "DataAnalyst",
  description: "Analyzes data and provides insights with structured output",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [calculateTool],
});

const reportGeneratorAgent = new Agent({
  name: "ReportGenerator",
  description: "Generates comprehensive reports in structured format",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const summaryWriterAgent = new Agent({
  name: "SummaryWriter",
  description: "Creates concise summaries and explanations",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create supervisor agent with new API
export const advancedSupervisorAgent = new Agent({
  name: "AdvancedSupervisor",
  description: "Coordinates between agents using different execution methods",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [
    summaryWriterAgent,
    // ✅ NEW STYLE: generateObject with schema
    createSubagent({
      agent: dataAnalystAgent,
      method: "generateObject",
      schema: analysisResultSchema,
      options: {
        temperature: 0.3, // Lower temperature for structured analysis
        maxTokens: 1500,
      },
    }),

    // ✅ NEW STYLE: streamObject with schema
    createSubagent({
      agent: reportGeneratorAgent,
      method: "streamObject",
      schema: reportSchema,
      options: {
        temperature: 0.5,
        maxTokens: 2000,
      },
    }),
  ],
});

console.log("🚀 Advanced SubAgent API Example Started!");
console.log("📊 Available Methods:");
console.log("  - streamText (default, backward compatible)");
console.log("  - generateText (with custom options)");
console.log("  - generateObject (structured output)");
console.log("  - streamObject (streaming structured output)");
console.log("\n💡 Try asking the supervisor to:");
console.log("  - 'Analyze sales data for Q4 and generate a report'");
console.log("  - 'Create a summary of market trends'");
console.log("  - 'Calculate revenue growth and provide insights'");
