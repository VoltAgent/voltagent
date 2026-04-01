import { describe, expect, it } from "vitest";
import { createMockLanguageModel } from "../agent/test-utils";
import { PlanAgent } from "./plan-agent";

const expectedTools = [
  "write_todos",
  "ls",
  "read_file",
  "write_file",
  "edit_file",
  "glob",
  "grep",
  "task",
];
const basePromptSnippet =
  "In order to complete the objective that the user asks of you, you have access to a number of standard tools.";

describe("PlanAgent", () => {
  it("registers planning, filesystem, and task tools by default", () => {
    const agent = new PlanAgent({
      name: "plan-agent-test",
      model: createMockLanguageModel(),
    });

    const toolNames = agent.getTools().map((tool) => tool.name);
    for (const toolName of expectedTools) {
      expect(toolNames).toContain(toolName);
    }
  });

  it("omits task tool when disabled and no subagents", () => {
    const agent = new PlanAgent({
      name: "plan-agent-no-task",
      model: createMockLanguageModel(),
      generalPurposeAgent: false,
      task: false,
    });

    const toolNames = agent.getTools().map((tool) => tool.name);
    expect(toolNames).not.toContain("task");
  });

  it("resolves dynamic systemPrompt with base and extension prompts", async () => {
    const extensionPrompt = "Extra system prompt.";
    const agent = new PlanAgent({
      name: "plan-agent-dynamic",
      model: createMockLanguageModel(),
      systemPrompt: ({ context }) => `Tenant: ${context.get("tenant")}`,
      extensions: [
        {
          name: "extra-prompt",
          apply: () => ({ systemPrompt: extensionPrompt }),
        },
      ],
    });

    expect(typeof agent.instructions).toBe("function");

    const resolved = await (agent.instructions as any)({
      context: new Map<string | symbol, unknown>([["tenant", "acme"]]),
      prompts: {
        getPrompt: async () => ({ type: "text", text: "unused" }),
      },
    });

    expect(typeof resolved).toBe("string");
    const resolvedText = resolved as string;

    expect(resolvedText).toContain("Tenant: acme");
    expect(resolvedText).toContain(basePromptSnippet);
    expect(resolvedText).toContain(extensionPrompt);
    expect(resolvedText.indexOf("Tenant: acme")).toBeLessThan(
      resolvedText.indexOf(basePromptSnippet),
    );
    expect(resolvedText.indexOf(basePromptSnippet)).toBeLessThan(
      resolvedText.indexOf(extensionPrompt),
    );
  });

  it("appends base prompt to dynamic chat system messages", async () => {
    const extensionPrompt = "Extra system prompt.";
    const agent = new PlanAgent({
      name: "plan-agent-dynamic-chat",
      model: createMockLanguageModel(),
      systemPrompt: async () => ({
        type: "chat",
        messages: [{ role: "system", content: "Core chat prompt." }],
      }),
      extensions: [
        {
          name: "extra-prompt",
          apply: () => ({ systemPrompt: extensionPrompt }),
        },
      ],
    });

    const resolved = await (agent.instructions as any)({
      context: new Map<string | symbol, unknown>(),
      prompts: {
        getPrompt: async () => ({ type: "text", text: "unused" }),
      },
    });

    expect(resolved).toMatchObject({ type: "chat" });
    const messages = (resolved as any).messages as Array<{ role: string; content: unknown }>;
    const systemMessage = [...messages].reverse().find((message) => message.role === "system");

    expect(systemMessage).toBeDefined();
    expect(systemMessage?.content).toContain("Core chat prompt.");
    expect(systemMessage?.content).toContain(basePromptSnippet);
    expect(systemMessage?.content).toContain(extensionPrompt);
  });
});
