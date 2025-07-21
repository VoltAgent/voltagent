import { Agent, createWorkflowChain } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// ==============================================================================
// Example: Human-in-the-Loop Expense Approval Workflow
// Concepts: Suspend/resume and step-level schemas
//
// Test Scenarios for VoltOps Platform
// 
// Scenario 1: Small expense (auto-approved)
// Input JSON:
// {
//   "employeeId": "EMP-123",
//   "amount": 250,
//   "category": "office-supplies",
//   "description": "New laptop mouse and keyboard"
// }
// Result: Automatically approved by system, no manager approval needed
//
// Scenario 2: Large expense (requires manager approval)
// Input JSON:
// {
//   "employeeId": "EMP-456",
//   "amount": 750,
//   "category": "travel",
//   "description": "Flight tickets for client meeting"
// }
// Result: Workflow suspends, waiting for manager approval
// Resume JSON:
// {
//   "approved": true,
//   "managerId": "MGR-001",
//   "comments": "Approved for important client",
//   "adjustedAmount": 700
// }
//
// Scenario 3: Large expense (rejected)
// Input JSON:
// {
//   "employeeId": "EMP-789",
//   "amount": 1500,
//   "category": "equipment",
//   "description": "Premium office chair"
// }
// Result: Workflow suspends, waiting for manager approval
// Resume JSON:
// {
//   "approved": false,
//   "managerId": "MGR-002",
//   "comments": "Budget exceeded for this quarter"
// }
// ==============================================================================
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
