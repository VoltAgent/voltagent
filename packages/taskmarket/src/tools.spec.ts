import { safeStringify } from "@voltagent/internal";
import { describe, expect, it } from "vitest";
import { createTaskmarketRequesterToolkit } from "./tools";
import type { CliRunResult, TaskmarketCliRunner } from "./types";

const REQUESTER = "0x1111111111111111111111111111111111111111";

class FakeRunner implements TaskmarketCliRunner {
  async run(_args: readonly string[]): Promise<CliRunResult> {
    return {
      stdout: safeStringify({ ok: true, data: {} }),
      stderr: "",
      exitCode: 0,
      timedOut: false,
      outputLimitExceeded: false,
    };
  }
}

describe("createTaskmarketRequesterToolkit", () => {
  it("exposes the complete requester workflow and no decision tool", () => {
    const toolkit = createTaskmarketRequesterToolkit({
      requesterAddress: REQUESTER,
      maximumSpendUsdc: "10",
      cliRunner: new FakeRunner(),
    });
    const names = toolkit.tools.map((tool) => "name" in tool && tool.name);
    expect(names).toEqual([
      "taskmarket_preview_task",
      "taskmarket_create_task",
      "taskmarket_get_task",
      "taskmarket_list_submissions",
      "taskmarket_review_submission_artifact",
    ]);
    expect(names.some((name) => typeof name === "string" && /accept|reject/u.test(name))).toBe(
      false,
    );
    expect(toolkit.addInstructions).toBe(true);
    expect(toolkit.instructions).toContain("Never retry");
  });

  it("always marks task creation as approval-gated", () => {
    const toolkit = createTaskmarketRequesterToolkit({
      requesterAddress: REQUESTER,
      maximumSpendUsdc: "10",
      cliRunner: new FakeRunner(),
    });
    const create = toolkit.tools.find(
      (tool) => "name" in tool && tool.name === "taskmarket_create_task",
    );
    expect(create).toHaveProperty("needsApproval", true);
    expect(create).toHaveProperty("mcp.annotations.readOnlyHint", false);
    expect(create).toHaveProperty("mcp.annotations.idempotentHint", false);
  });

  it("keeps preview local and returns the exact authorization statement", async () => {
    const toolkit = createTaskmarketRequesterToolkit({
      requesterAddress: REQUESTER,
      maximumSpendUsdc: "10",
      cliRunner: new FakeRunner(),
      now: () => new Date("2026-08-23T00:00:00.000Z"),
    });
    const preview = toolkit.tools.find(
      (tool) => "name" in tool && tool.name === "taskmarket_preview_task",
    );
    if (!preview || !("execute" in preview) || !preview.execute)
      throw new Error("Missing preview tool");
    const output = (await preview.execute({
      description: "Build a report.",
      rewardUsdc: "3",
      maximumSpendUsdc: "3",
      durationHours: 12,
      deliverables: ["report.md"],
    })) as { authorizationStatement: string };
    expect(output.authorizationStatement).toContain("Reward/funding amount: 3 USDC");
    expect(output.authorizationStatement).toContain("Deadline: 12 hours");
    expect(output.authorizationStatement).toContain("1. report.md");
  });
});
