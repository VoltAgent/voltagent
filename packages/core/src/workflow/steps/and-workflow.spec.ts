import { describe, expect, it } from "vitest";
import { z } from "zod";
import { VoltAgent } from "../../voltagent";
import { createWorkflow } from "../core";
import { andThen } from "./and-then";
import { andWorkflow } from "./and-workflow";
import { LibSQLStorage } from "../../memory";
import { WorkflowRegistry } from "../registry";

describe("andWorkflow", () => {
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
        memory: new LibSQLStorage({
          url: ":memory:",
        }),
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
        memory: new LibSQLStorage({
          url: ":memory:",
        }),
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
