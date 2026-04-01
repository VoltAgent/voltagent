import { Agent, VoltAgent, createTool, createWorkflowChain } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { MCPServer } from "@voltagent/mcp-server";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const logger = createPinoLogger({
  name: "with-mcp-server",
  level: "debug",
});

const currentTimeTool = createTool({
  name: "current_time",
  description: "Returns the current time as ISO and localized strings.",
  parameters: z.object({
    locale: z.string().optional().describe("Locale passed to Intl.DateTimeFormat"),
    timeZone: z.string().optional().describe("IANA timezone identifier"),
  }),
  outputSchema: z.object({
    iso: z.string(),
    display: z.string(),
  }),
  async execute({ locale, timeZone }) {
    const date = new Date();
    const formatter = Intl.DateTimeFormat(locale ?? "en-US", {
      timeZone,
      dateStyle: "full",
      timeStyle: "long",
    });

    return {
      iso: date.toISOString(),
      display: formatter.format(date),
    };
  },
});

const approvalTool = createTool({
  name: "confirm_action",
  description: "Ask the operator to approve a potentially risky action.",
  parameters: z.object({
    summary: z.string().describe("Short description of the action that needs confirmation"),
  }),
  async execute({ summary }, operationContext) {
    const request = operationContext?.elicitation;
    if (!request) {
      throw new Error("Elicitation bridge unavailable; cannot request confirmation");
    }

    const response = await request({
      message: `Please approve the following action: ${summary}`,
      schema: {
        type: "object",
        properties: {
          confirmed: {
            type: "boolean",
            description: "Set to true if the action should proceed",
          },
          approver: {
            type: "string",
            description: "Name of the operator giving approval",
          },
        },
        required: ["confirmed", "approver"],
      },
    });

    const content = (
      response as { content?: { confirmed?: boolean; approver?: string } } | undefined
    )?.content;

    return {
      confirmed: content?.confirmed ?? false,
      approver: content?.approver ?? "unknown",
    };
  },
});

const storyWriter = new Agent({
  name: "StoryWriterAgent",
  purpose: "Craft imaginative short stories on request.",
  instructions: "You are a creative story writer.",
  model: "openai/gpt-4o-mini",
});

const translatorAgent = new Agent({
  name: "TranslatorAgent",
  purpose: "Translate content between languages while keeping tone and intent.",
  instructions: "You are a skilled translator.",
  model: "openai/gpt-4o-mini",
});

const supervisorAgent = new Agent({
  name: "SupervisorAgent",
  purpose: "Decide whether a task should be written or translated and delegate accordingly.",
  instructions:
    "You are a supervisor agent that delegates tasks to specialized agents. Use the `StoryWriterAgent` agent for creative writing tasks and the `TranslatorAgent` agent for translation tasks. Always choose the most appropriate agent for the given task.",
  model: "openai/gpt-4o-mini",
  subAgents: [storyWriter, translatorAgent],
});

const assistant = new Agent({
  name: "AssistantAgent",
  purpose: "Answer general questions and call helper tools such as current time or approval.",
  instructions:
    "You are a helpful assistant. Use the `current_time` tool when the user wants to know the time.",
  model: "openai/gpt-4o-mini",
  tools: [currentTimeTool, approvalTool],
});

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

const mcpServer = new MCPServer({
  name: "voltagent-example",
  version: "0.1.0",
  description: "VoltAgent MCP stdio example",
  protocols: {
    stdio: true,
    http: true,
    sse: true,
  },
  filterTools: ({ items }) => {
    return items;
  },
  // Add the workflow to the MCP server
  workflows: { expenseApprovalWorkflow },
  adapters: {
    prompts: {
      async listPrompts() {
        return [
          {
            name: "expense-triage",
            description: "Summaries the expense request before approval",
            arguments: [],
          },
        ];
      },
      async getPrompt({ name }) {
        if (name !== "expense-triage") {
          throw new Error(`Unknown prompt '${name}'`);
        }

        return {
          description: "Summaries the current expense request for an approver.",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Provide a short summary of the expense request including amount and category.",
              },
            },
          ],
        };
      },
    },
    resources: {
      async listResources() {
        return [
          {
            uri: "volt://docs/expense-policy",
            name: "Expense Policy",
            description: "High-level policy reminder for managers approving expenses.",
            mimeType: "text/markdown",
          },
        ];
      },
      async readResource(uri) {
        if (uri !== "volt://docs/expense-policy") {
          throw new Error(`Unknown resource '${uri}'`);
        }
        return {
          uri,
          mimeType: "text/markdown",
          text: "# Expense Policy\n\nExpenses above $500 require explicit manager approval.",
        };
      },
    },
    elicitation: {
      async sendRequest(request) {
        console.log("Elicitation request received", request);
        // In a real integration you would ask a human. For the example we auto-approve.
        return {
          action: "accept",
          content: {
            confirmed: true,
            approver: "demo-operator",
          },
        };
      },
    },
  },
});

new VoltAgent({
  agents: {
    supervisorAgent,
    translatorAgent,
    storyWriter,
    assistant,
  },
  mcpServers: {
    mcpServer,
  },
  server: honoServer({ port: 3141 }),
  logger,
});
