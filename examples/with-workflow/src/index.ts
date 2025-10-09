import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createWorkflowChain } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Define reusable agents
const analysisAgent = new Agent({
  name: "AnalysisAgent",
  model: openai("gpt-4o-mini"),
  instructions: "You are a data analyst. Provide clear, structured analysis.",
});

const contentAgent = new Agent({
  name: "ContentAgent",
  model: openai("gpt-4o-mini"),
  instructions: "You are a content creator. Generate engaging and accurate content.",
});

// ==============================================================================
// Example 1: Basic Order Processing Workflow
// Concepts: Basic steps (andThen), AI agent (andAgent), conditional logic (andWhen)
// ==============================================================================
const orderProcessingWorkflow = createWorkflowChain({
  id: "order-processing",
  name: "Order Processing Workflow",
  purpose: "Process orders with fraud detection and special handling for VIP customers",

  // Define input and output schemas for type safety
  input: z.object({
    orderId: z.string(),
    customerId: z.string(),
    amount: z.number(),
    items: z.array(z.string()),
  }),
  result: z.object({
    orderId: z.string(),
    status: z.enum(["approved", "rejected", "needs-review"]),
    totalWithDiscount: z.number(),
  }),
})
  // Step 1: Validate order and calculate totals
  .andThen({
    id: "validate-order",
    execute: async ({ data }) => {
      console.log(`Validating order ${data.orderId}...`);

      // Simple validation logic
      const isValid = data.amount > 0 && data.items.length > 0;

      return {
        ...data,
        isValid,
        baseTotal: data.amount,
      };
    },
  })

  // Step 2: Use AI to analyze order for fraud risk
  .andAgent(
    async ({ data }) => `
      Analyze this order for fraud risk:
      Order ID: ${data.orderId}
      Customer ID: ${data.customerId}
      Amount: $${data.amount}
      Items: ${data.items.join(", ")}
      
      Provide risk level (low/medium/high) and reasoning.
    `,
    analysisAgent,
    {
      schema: z.object({
        riskLevel: z.enum(["low", "medium", "high"]),
        reasoning: z.string(),
      }),
    },
  )

  // Step 3: Calculate discount for VIP customers
  .andThen({
    id: "calculate-discount",
    execute: async ({ data, getStepData }) => {
      const orderData = getStepData("validate-order")?.output;

      // Check if VIP customer qualifies for discount
      if (orderData?.customerId.startsWith("VIP") && orderData?.amount > 100) {
        const discount = (orderData?.baseTotal || 0) * 0.2;
        console.log(`Applying VIP discount of $${discount}`);

        return {
          ...data,
          discount,
          totalWithDiscount: (orderData?.baseTotal || 0) - discount,
        };
      }

      // No discount
      return {
        ...data,
        discount: 0,
        totalWithDiscount: orderData?.baseTotal || 0,
      };
    },
  })

  // Step 4: Final decision based on validation and risk
  .andThen({
    id: "final-decision",
    execute: async ({ data, getStepData }) => {
      // Get data from previous steps
      const orderData = getStepData("validate-order")?.output;
      const discountData = getStepData("calculate-discount")?.output;

      // Determine final status
      let status: "approved" | "rejected" | "needs-review";

      if (!orderData?.isValid || data.riskLevel === "high") {
        status = "rejected";
      } else if (data.riskLevel === "medium") {
        status = "needs-review";
      } else {
        status = "approved";
      }

      return {
        orderId: orderData?.orderId || "",
        status,
        totalWithDiscount: discountData?.totalWithDiscount || orderData?.baseTotal || 0,
      };
    },
  });

// ==============================================================================
// Example 2: Human-in-the-Loop Approval Workflow
// Concepts: Suspend/resume, step-level schemas, human intervention
// ==============================================================================
const expenseApprovalWorkflow = createWorkflowChain({
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
    // Define what data we expect when resuming this step
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
      comments: z.string().optional(),
      adjustedAmount: z.number().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      // If we're resuming with manager's decision
      if (resumeData) {
        console.log(`Manager ${resumeData.managerId} made decision`);
        return {
          ...data,
          approved: resumeData.approved,
          approvedBy: resumeData.managerId,
          finalAmount: resumeData.adjustedAmount || data.amount,
          managerComments: resumeData.comments,
        };
      }

      // Check if manager approval is needed (expenses over $500)
      if (data.amount > 500) {
        console.log(`Expense of $${data.amount} requires manager approval`);

        // Suspend workflow and wait for manager input
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
      if (data.approved) {
        console.log(`Expense approved for $${data.finalAmount}`);
      } else {
        console.log("Expense rejected");
      }

      return {
        status: data.approved ? "approved" : "rejected",
        approvedBy: data.approvedBy,
        finalAmount: data.finalAmount,
      };
    },
  });

// ==============================================================================
// Example 3: Multi-Step Content Analysis Workflow
// Concepts: Step schemas, data transformation, logging with andTap
// ==============================================================================
const contentAnalysisWorkflow = createWorkflowChain({
  id: "content-analysis",
  name: "Content Analysis Workflow",
  purpose: "Analyze content for sentiment, keywords, and generate summary",

  input: z.object({
    content: z.string(),
    language: z.enum(["en", "es", "fr"]).default("en"),
  }),
  result: z.object({
    sentiment: z.enum(["positive", "negative", "neutral"]),
    keywords: z.array(z.string()),
    summary: z.string(),
    wordCount: z.number(),
  }),
})
  // Step 1: Log start and prepare content
  .andTap({
    id: "log-start",
    execute: async ({ data }) => {
      console.log(`Starting analysis of ${data.content.length} characters`);
      console.log(`Language: ${data.language}`);
    },
  })

  // Step 2: Basic text analysis
  .andThen({
    id: "text-analysis",
    execute: async ({ data }) => {
      const words = data.content.split(/\s+/);
      const wordCount = words.length;
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;

      return {
        ...data,
        wordCount,
        avgWordLength,
        hasQuestions: data.content.includes("?"),
      };
    },
  })

  // Step 3: AI-powered sentiment and keyword analysis
  .andAgent(
    async ({ data }) => `
      Analyze this text and provide:
      1. Overall sentiment (positive/negative/neutral)
      2. Top 5 keywords or key phrases
      3. A brief 2-sentence summary
      
      Text: "${data.content}"
      
      Consider that the text has ${data.wordCount} words.
    `,
    analysisAgent,
    {
      schema: z.object({
        sentiment: z.enum(["positive", "negative", "neutral"]),
        keywords: z.array(z.string()).max(5),
        summary: z.string(),
      }),
    },
  )

  // Step 4: Transform data using only inputSchema
  .andThen({
    id: "transform-results",
    inputSchema: z.object({
      sentiment: z.enum(["positive", "negative", "neutral"]),
      keywords: z.array(z.string()),
      summary: z.string(),
    }),
    execute: async ({ data, getStepData }) => {
      // Get word count from earlier step
      const analysisData = getStepData("text-analysis")?.output;

      // inputSchema ensures we only see sentiment, keywords, summary
      console.log(`Analysis complete: ${data.sentiment} sentiment`);

      return {
        sentiment: data.sentiment,
        keywords: data.keywords,
        summary: data.summary,
        wordCount: analysisData?.wordCount || 0,
      };
    },
  })

  // Step 5: Log metrics using inputSchema
  .andTap({
    id: "log-metrics",
    inputSchema: z.object({
      sentiment: z.enum(["positive", "negative", "neutral"]),
      keywords: z.array(z.string()),
      wordCount: z.number(),
    }),
    execute: async ({ data }) => {
      console.log("\nAnalysis Metrics:");
      console.log(`- Sentiment: ${data.sentiment}`);
      console.log(`- Keywords: ${data.keywords.join(", ")}`);
      console.log(`- Word count: ${data.wordCount}`);
    },
  });

// ==============================================================================
// Example 4: Article Summarization with Dynamic Schema
// Concepts: Dynamic schema generation based on workflow input
// ==============================================================================
const articleSummarizationWorkflow = createWorkflowChain({
  id: "article-summarizer",
  name: "Article Summarization Workflow",
  purpose: "Summarize an article with a dynamically specified length",
  input: z.object({
    article: z.string(),
    min: z.number().default(50),
    max: z.number().default(150),
  }),
  result: z.object({
    summary: z.string(),
  }),
}).andAgent(
  async ({ data }) =>
    `Summarize the following article in ${data.min} to ${data.max} characters:
  
  Article: ${data.article}`,
  contentAgent,
  {
    // Dynamically generate the schema based on the input data
    schema: ({ data }) => {
      console.log(`Generating schema with min: ${data.min}, max: ${data.max}`);
      return z.object({
        summary: z
          .string()
          .min(data.min, `Summary must be at least ${data.min} characters`)
          .max(data.max, `Summary must be at most ${data.max} characters`),
      });
    },
  },
);

// Register workflows with VoltAgent

// Create logger
const logger = createPinoLogger({
  name: "with-workflow",
  level: "debug",
});

new VoltAgent({
  agents: {
    analysisAgent,
    contentAgent,
  },
  logger,
  server: honoServer({ port: 3141 }),
  workflows: {
    orderProcessingWorkflow,
    expenseApprovalWorkflow,
    contentAnalysisWorkflow,
    articleSummarizationWorkflow,
  },
});
