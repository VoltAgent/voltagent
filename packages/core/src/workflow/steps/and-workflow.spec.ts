import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { Memory } from "../../memory";
import { InMemoryStorageAdapter } from "../../memory/adapters/storage/in-memory";
import { createWorkflow } from "../core";
import { WorkflowRegistry } from "../registry";
import { andThen } from "./and-then";
import { andWorkflow } from "./and-workflow";

describe.sequential("andWorkflow", () => {
  const memoryInstances: Memory[] = [];

  // Helper function to create test stores
  const createTestStores = () => {
    const memory = new Memory({ storage: new InMemoryStorageAdapter() });
    memoryInstances.push(memory);
    return { memory };
  };

  afterEach(async () => {
    // Clear storage instances
    memoryInstances.length = 0;

    // Clear workflow registry
    const registry = WorkflowRegistry.getInstance();
    // @ts-ignore - accessing private property for cleanup
    registry.workflows.clear();
  });

  it("should run the nested workflow", async () => {
    const nestedWorkflow = createWorkflow(
      {
        id: "nested",
        name: "nested",
        result: z.object({
          processed: z.boolean(),
          workflow: z.string(),
          count: z.number(),
        }),
        ...createTestStores(),
      },
      andThen({
        id: "nested-step",
        execute: async () => {
          return { workflow: "is-nested", processed: true, count: 1 };
        },
      }),
      andThen({
        id: "nested-step-2",
        execute: async (ctx) => {
          return { workflow: "is-nested", processed: true, count: ctx.data.count + 1 };
        },
      }),
    );

    const workflow = createWorkflow(
      {
        id: "root",
        name: "root",
        result: z.object({
          processed: z.boolean(),
          workflow: z.string().nullable(),
        }),
        ...createTestStores(),
      },
      andThen({
        id: "root-step",
        execute: async () => {
          return { processed: false };
        },
      }),
      andWorkflow(nestedWorkflow),
    );

    const registry = WorkflowRegistry.getInstance();
    registry.registerWorkflow(nestedWorkflow);
    registry.registerWorkflow(workflow);

    const result = await workflow.run({});

    expect(result.result).toEqual({
      processed: true,
      workflow: "is-nested",
      count: 2,
    });
  });
});
