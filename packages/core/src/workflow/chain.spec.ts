import { describe, expect, it, beforeEach } from "vitest";
import { z } from "zod";
import { createWorkflowChain } from "./chain";
import { LibSQLStorage } from "../memory/libsql";
import { WorkflowRegistry } from "./registry";

describe("workflow.run", () => {
  beforeEach(() => {
    // Clear registry before each test
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("should return the expected result", async () => {
    // Create workflow with memory
    const memory = new LibSQLStorage({ url: ":memory:" });

    const workflow = createWorkflowChain({
      id: "test",
      name: "test",
      input: z.object({
        name: z.string(),
      }),
      result: z.object({
        name: z.string(),
      }),
      memory, // Add memory
    })
      .andThen({
        id: "step-1-join-name",
        name: "Join with john",
        execute: async ({ data }) => {
          return {
            name: [data.name, "john"].join(" "),
          };
        },
      })
      .andThen({
        id: "step-2-add-surname",
        name: "Add surname",
        execute: async ({ data }) => {
          return {
            name: [data.name, "doe"].join(" "),
          };
        },
      });

    // Register workflow to registry
    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(workflow.toWorkflow());

    const result = await workflow.run({
      name: "Who is",
    });

    expect(result).toEqual({
      executionId: expect.any(String),
      startAt: expect.any(Date),
      endAt: expect.any(Date),
      status: "completed",
      result: {
        name: "Who is john doe",
      },
    });
  });
});
