import { afterEach, describe, expect, it, vi } from "vitest";
import { Agent } from "../agent/agent";
import { createMockLanguageModel } from "../agent/test-utils";
import { AgentRegistry } from "../registries/agent-registry";
import { Workspace } from "./index";

describe("Workspace global defaults", () => {
  const registry = AgentRegistry.getInstance();

  afterEach(() => {
    registry.setGlobalWorkspace(undefined);
  });

  it("inherits the global workspace when agent doesn't specify one", () => {
    const workspace = new Workspace({ id: "global-workspace" });
    registry.setGlobalWorkspace(workspace);

    const agent = new Agent({
      name: "test-agent",
      instructions: "test",
      model: createMockLanguageModel(),
    });

    expect(agent.getWorkspace()).toBe(workspace);
  });

  it("allows agent to opt out of global workspace", () => {
    const workspace = new Workspace({ id: "global-workspace" });
    registry.setGlobalWorkspace(workspace);

    const agent = new Agent({
      name: "test-agent",
      instructions: "test",
      model: createMockLanguageModel(),
      workspace: false,
    });

    expect(agent.getWorkspace()).toBeUndefined();
  });
});

describe("Workspace direct search access", () => {
  it("rejects direct search when allowDirectAccess is false", async () => {
    const workspace = new Workspace({
      search: {
        allowDirectAccess: false,
      },
    });

    await expect(workspace.search("hello")).rejects.toThrow("direct access");
  });

  it("allows direct index/search when allowDirectAccess is true", async () => {
    const workspace = new Workspace({
      search: {
        allowDirectAccess: true,
      },
    });

    await workspace.index("/doc.txt", "hello world");
    const results = await workspace.search("hello");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.path).toBe("/doc.txt");
  });
});

describe("Workspace lifecycle", () => {
  it("starts and destroys the sandbox", async () => {
    const start = vi.fn();
    const destroy = vi.fn();

    const workspace = new Workspace({
      sandbox: {
        name: "test",
        execute: async () => ({
          stdout: "",
          stderr: "",
          exitCode: 0,
          durationMs: 0,
          timedOut: false,
          aborted: false,
          stdoutTruncated: false,
          stderrTruncated: false,
        }),
        start,
        destroy,
      },
    });

    await workspace.init();
    expect(start).toHaveBeenCalled();

    await workspace.destroy();
    expect(destroy).toHaveBeenCalled();
  });
});
