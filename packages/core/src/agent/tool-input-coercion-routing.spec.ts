import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Tool } from "../tool";
import { Agent } from "./agent";

describe("tool routing argument coercion", () => {
  it("executes a routed tool after coercing stringified container arguments", async () => {
    const execute = vi.fn().mockResolvedValue("processed");
    const tool = new Tool({
      name: "processFiles",
      description: "Process files with filters",
      parameters: z.object({
        files: z.array(z.string()),
        filters: z.object({ owner: z.string() }),
      }),
      execute,
    });
    const agent = new Agent({
      name: "coercion-agent",
      instructions: "Process files",
      model: new MockLanguageModelV3(),
      tools: [tool],
      toolRouting: {},
    });
    const testAgent = agent as unknown as {
      createOperationContext(input: string): unknown;
      prepareTools(
        tools: unknown[],
        context: unknown,
        maxSteps: number,
      ): Promise<Record<string, { execute: (args: unknown) => Promise<unknown> }>>;
    };
    const context = testAgent.createOperationContext("Process the report");
    const prepared = await testAgent.prepareTools([], context, 3);

    await prepared.searchTools.execute({ query: "processFiles" });
    const result = await prepared.callTool.execute({
      name: "processFiles",
      args: { files: '["report.csv"]', filters: '{"owner":"workspace"}' },
    });

    expect(result).toBe("processed");
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(
      { files: ["report.csv"], filters: { owner: "workspace" } },
      expect.anything(),
    );
  });
});
