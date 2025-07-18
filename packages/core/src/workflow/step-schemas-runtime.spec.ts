import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import { createWorkflowChain } from "./chain";
import { LibSQLStorage } from "../memory/libsql";
import { WorkflowRegistry } from "./registry";

describe("Step-level Schema Runtime Tests", () => {
  let registry: WorkflowRegistry;
  let memory: LibSQLStorage;

  beforeEach(() => {
    // Clear registry before each test
    registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
    (registry as any).workflowHistoryManagers.clear();

    // Create in-memory storage
    memory = new LibSQLStorage({ url: ":memory:" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  describe("resumeSchema runtime behavior", () => {
    it("should handle resume with step-level resumeSchema", async () => {
      const workflow = createWorkflowChain({
        id: "test-resume-runtime",
        name: "Test Resume Runtime",
        input: z.object({ amount: z.number() }),
        result: z.object({ status: z.string(), approvedBy: z.string() }),
        memory,
      })
        .andThen({
          id: "check-approval",
          resumeSchema: z.object({
            approved: z.boolean(),
            approver: z.string(),
            comments: z.string().optional(),
          }),
          execute: async ({ data, suspend, resumeData }) => {
            if (resumeData) {
              return {
                amount: data.amount,
                status: resumeData.approved ? "approved" : "rejected",
                approvedBy: resumeData.approver,
                comments: resumeData.comments,
              };
            }

            if (data.amount > 1000) {
              await suspend("Approval required", {
                amount: data.amount,
                reason: "High value transaction",
              });
            }

            return {
              amount: data.amount,
              status: "auto-approved",
              approvedBy: "system",
            };
          },
        })
        .andThen({
          id: "finalize",
          execute: async ({ data }) => ({
            status: data.status,
            approvedBy: data.approvedBy,
          }),
        });

      // Register workflow with registry
      registry.registerWorkflow(workflow.toWorkflow());

      // Test auto-approval (no suspension)
      const autoResult = await workflow.run({ amount: 500 });
      expect(autoResult.status).toBe("completed");
      expect(autoResult.result).toEqual({
        status: "auto-approved",
        approvedBy: "system",
      });

      // Test suspension and resume
      const suspendController = workflow.createSuspendController?.();
      const suspendPromise = workflow.run(
        { amount: 5000 },
        { signal: suspendController?.signal, suspendController },
      );

      // Let it run a bit then suspend
      await new Promise((resolve) => setTimeout(resolve, 50));
      suspendController?.suspend("Manual suspension");

      const suspendedResult = await suspendPromise;
      expect(suspendedResult.status).toBe("suspended");
      expect(suspendedResult.suspension?.suspendData).toEqual({
        amount: 5000,
        reason: "High value transaction",
      });

      // Resume with approval
      const resumedResult = await suspendedResult.resume({
        approved: true,
        approver: "manager@company.com",
        comments: "Approved for VIP customer",
      });

      expect(resumedResult.status).toBe("completed");
      expect(resumedResult.result).toEqual({
        status: "approved",
        approvedBy: "manager@company.com",
      });
    });

    it("should use step resumeSchema over workflow resumeSchema", async () => {
      const workflow = createWorkflowChain({
        id: "test-schema-priority",
        name: "Test Schema Priority",
        input: z.object({ value: z.number() }),
        result: z.object({ final: z.string() }),
        memory,
        // Workflow-level schemas
        suspendSchema: z.object({
          workflowSuspendField: z.string(),
        }),
        resumeSchema: z.object({
          workflowResumeField: z.string(),
        }),
      }).andThen({
        id: "step-with-own-schemas",
        // Step-level schemas should take precedence
        suspendSchema: z.object({
          stepSuspendField: z.number(),
        }),
        resumeSchema: z.object({
          stepResumeField: z.boolean(),
        }),
        execute: async ({ suspend, resumeData }) => {
          if (resumeData) {
            // Should have step-level resumeData type
            return {
              final: `Resumed with: ${resumeData.stepResumeField}`,
            };
          }

          // Should use step-level suspend schema
          await suspend("Step suspension", {
            stepSuspendField: 42,
          });
        },
      });

      // Register workflow
      registry.registerWorkflow(workflow.toWorkflow());

      const controller = workflow.createSuspendController?.();
      const runPromise = workflow.run(
        { value: 100 },
        { signal: controller?.signal, suspendController: controller },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      controller?.suspend("Test");

      const suspended = await runPromise;
      expect(suspended.status).toBe("suspended");
      expect(suspended.suspension?.suspendData).toEqual({
        stepSuspendField: 42,
      });

      // Resume with step-level schema data
      const resumed = await suspended.resume({
        stepResumeField: true,
      });

      expect(resumed.status).toBe("completed");
      expect(resumed.result?.final).toBe("Resumed with: true");
    });
  });

  describe("multiple steps with different schemas", () => {
    it("should handle workflow with multiple schema-defined steps", async () => {
      const workflow = createWorkflowChain({
        id: "multi-step-schemas",
        name: "Multi Step Schemas",
        input: z.object({ orderId: z.string() }),
        result: z.object({ message: z.string() }),
        memory,
      })
        .andThen({
          id: "fetch-order",
          outputSchema: z.object({
            orderId: z.string(),
            amount: z.number(),
            customerId: z.string(),
          }),
          execute: async ({ data }) => ({
            orderId: data.orderId,
            amount: 2500,
            customerId: "cust-123",
          }),
        })
        .andThen({
          id: "check-approval",
          resumeSchema: z.object({
            approved: z.boolean(),
            managerId: z.string(),
          }),
          execute: async ({ data, suspend, resumeData }) => {
            if (resumeData) {
              return {
                ...data,
                approved: resumeData.approved,
                approvedBy: resumeData.managerId,
              };
            }

            if (data.amount > 2000) {
              await suspend("Manager approval needed");
            }

            return {
              ...data,
              approved: true,
              approvedBy: "auto",
            };
          },
        })
        .andThen({
          id: "check-inventory",
          resumeSchema: z.object({
            inStock: z.boolean(),
            warehouseId: z.string(),
          }),
          execute: async ({ data, suspend, resumeData }) => {
            if (resumeData) {
              return {
                ...data,
                inventoryChecked: true,
                inStock: resumeData.inStock,
                warehouseId: resumeData.warehouseId,
              };
            }

            // Simulate inventory check needed
            await suspend("Inventory check required");
          },
        })
        .andThen({
          id: "complete",
          execute: async ({ data }) => ({
            message: `Order ${data.orderId} ${
              data.approved ? "approved" : "rejected"
            } and ${data.inStock ? "ready to ship" : "backordered"} from ${data.warehouseId}`,
          }),
        });

      // Register workflow
      registry.registerWorkflow(workflow.toWorkflow());

      // Run with suspensions
      const controller = workflow.createSuspendController?.();
      let result = await workflow.run(
        { orderId: "order-456" },
        { signal: controller?.signal, suspendController: controller },
      );

      // First suspension for approval
      await new Promise((resolve) => setTimeout(resolve, 50));
      controller?.suspend("Test");
      result = await result;

      expect(result.status).toBe("suspended");
      expect(result.suspension?.suspendedStepIndex).toBe(1); // check-approval step

      // Resume with approval
      result = await result.resume({
        approved: true,
        managerId: "mgr-789",
      });

      // Should suspend again for inventory
      expect(result.status).toBe("suspended");
      expect(result.suspension?.suspendedStepIndex).toBe(2); // check-inventory step

      // Resume with inventory data
      result = await result.resume({
        inStock: true,
        warehouseId: "warehouse-west",
      });

      expect(result.status).toBe("completed");
      expect(result.result?.message).toBe(
        "Order order-456 approved and ready to ship from warehouse-west",
      );
    });
  });
});
