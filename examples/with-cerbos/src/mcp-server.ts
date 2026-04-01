import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";

// In-memory expense storage for demo
const expenses: Array<{
  id: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdBy: string;
}> = [
  { id: "1", description: "Office supplies", amount: 150, status: "pending", createdBy: "user-1" },
  { id: "2", description: "Team lunch", amount: 200, status: "approved", createdBy: "user-2" },
  { id: "3", description: "Software license", amount: 500, status: "pending", createdBy: "user-1" },
];

/**
 * Creates an MCP server with expense management tools.
 * Note: Authorization is handled by VoltAgent's MCPConfiguration, not here.
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: "Expense Management MCP Server",
    version: "1.0.0",
  });

  // List all expenses
  server.registerTool(
    "list_expenses",
    {
      description: "Lists all expenses in the system",
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(expenses, null, 2),
        },
      ],
    }),
  );

  // Add a new expense
  server.registerTool(
    "add_expense",
    {
      description: "Creates a new expense entry",
      inputSchema: z.object({
        description: z.string().describe("Description of the expense"),
        amount: z.number().describe("Amount in dollars"),
      }),
    },
    async ({ description, amount }) => {
      const newExpense = {
        id: randomUUID(),
        description,
        amount,
        status: "pending" as const,
        createdBy: "current-user",
      };
      expenses.push(newExpense);
      return {
        content: [
          {
            type: "text",
            text: `Created expense: ${JSON.stringify(newExpense)}`,
          },
        ],
      };
    },
  );

  // Approve an expense
  server.registerTool(
    "approve_expense",
    {
      description: "Approves a pending expense",
      inputSchema: z.object({
        expenseId: z.string().describe("ID of the expense to approve"),
      }),
    },
    async ({ expenseId }) => {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) {
        return { content: [{ type: "text", text: `Expense ${expenseId} not found` }] };
      }
      expense.status = "approved";
      return {
        content: [{ type: "text", text: `Approved expense: ${JSON.stringify(expense)}` }],
      };
    },
  );

  // Reject an expense
  server.registerTool(
    "reject_expense",
    {
      description: "Rejects a pending expense",
      inputSchema: z.object({
        expenseId: z.string().describe("ID of the expense to reject"),
      }),
    },
    async ({ expenseId }) => {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) {
        return { content: [{ type: "text", text: `Expense ${expenseId} not found` }] };
      }
      expense.status = "rejected";
      return {
        content: [{ type: "text", text: `Rejected expense: ${JSON.stringify(expense)}` }],
      };
    },
  );

  // Delete an expense (admin only)
  server.registerTool(
    "delete_expense",
    {
      description: "Permanently deletes an expense",
      inputSchema: z.object({
        expenseId: z.string().describe("ID of the expense to delete"),
      }),
    },
    async ({ expenseId }) => {
      const index = expenses.findIndex((e) => e.id === expenseId);
      if (index === -1) {
        return { content: [{ type: "text", text: `Expense ${expenseId} not found` }] };
      }
      const deleted = expenses.splice(index, 1)[0];
      return {
        content: [{ type: "text", text: `Deleted expense: ${JSON.stringify(deleted)}` }],
      };
    },
  );

  // Superpower tool (admin only)
  server.registerTool(
    "superpower_tool",
    {
      description: "Administrative superpower tool - use with caution",
    },
    async () => ({
      content: [{ type: "text", text: "Superpower activated! All expenses approved." }],
    }),
  );

  return server;
}

/**
 * Starts the MCP server on the specified port.
 */
export async function startMCPServer(port = 3142): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(port, () => {
    console.log(`MCP Server running on http://localhost:${port}/mcp`);
  });
}
