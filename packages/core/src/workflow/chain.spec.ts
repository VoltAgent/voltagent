import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createWorkflowChain } from "./chain";

describe("workflow.run", () => {
  it("should return the expected result", async () => {
    const workflow = createWorkflowChain({
      id: "test",
      name: "test",
      input: z.object({
        name: z.string(),
      }),
      result: z.object({
        name: z.string(),
      }),
    })
      .andThen({
        execute: async (input) => {
          return {
            name: [input.name, "john"].join(" "),
          };
        },
      })
      .andThen({
        execute: async (input) => {
          return {
            name: [input.name, "doe"].join(" "),
          };
        },
      });

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
