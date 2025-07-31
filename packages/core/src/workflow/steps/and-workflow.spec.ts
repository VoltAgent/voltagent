import { describe, expect, it } from "vitest";
import { z } from "zod";
import { VoltAgent } from "../../voltagent";
import { createWorkflow } from "../core";
import { andThen } from "./and-then";
import { andWorkflow } from "./and-workflow";

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
      },
      andThen({
        id: "root-step",
        execute: async () => {
          return { processed: false };
        },
      }),
      andWorkflow(nestedWorkflow),
    );

    new VoltAgent({
      agents: {},
      workflows: {
        root: workflow,
        nested: nestedWorkflow,
      },
      autoStart: false,
    });

    const result = await workflow.run({});

    expect(result.result).toEqual({
      processed: true,
      workflow: "is-nested",
      count: 2,
    });
  });
});
