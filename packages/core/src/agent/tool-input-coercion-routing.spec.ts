import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { z as z4 } from "zod/v4";
import { Tool } from "../tool";
import { Agent } from "./agent";
import type { ToolSchema } from "./providers/base/types";

describe("tool routing argument coercion", () => {
  const setupRoutedTool = async (parameters: ToolSchema) => {
    const execute = vi.fn().mockResolvedValue("processed");
    const tool = new Tool({
      name: "processFiles",
      description: "Process files with filters",
      parameters,
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

    return { execute, prepared };
  };

  describe.each([
    {
      version: "Zod 3",
      parameters: z.object({
        files: z.array(z.string()),
        filters: z.object({ owner: z.string() }),
      }),
    },
    {
      version: "Zod 4",
      parameters: z4.object({
        files: z4.array(z4.string()),
        filters: z4.object({ owner: z4.string() }),
      }) as unknown as ToolSchema,
    },
  ])("with $version tool schema", ({ parameters }) => {
    it("executes a routed tool after coercing stringified container arguments", async () => {
      const { execute, prepared } = await setupRoutedTool(parameters);

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

    it("rejects coerced container arguments that fail schema revalidation", async () => {
      const { execute, prepared } = await setupRoutedTool(parameters);

      const result = await prepared.callTool.execute({
        name: "processFiles",
        args: { files: "[42]", filters: '{"owner":"workspace"}' },
      });

      expect(result).toMatchObject({
        error: true,
        message: expect.stringContaining('Invalid arguments for tool "processFiles"'),
      });
      expect((result as { message: string }).message).toMatch(/expected string, received number/i);
      expect(execute).not.toHaveBeenCalled();
    });
  });
});
