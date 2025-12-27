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
});
