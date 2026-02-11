import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { Workspace } from "../index";
import { LocalSandbox } from "./local";
import { createWorkspaceSandboxToolkit } from "./toolkit";

const buildExecuteOptions = () => ({
  toolContext: { callId: "tool-call-1" },
  systemContext: new Map(),
  abortController: new AbortController(),
});

describe("Workspace sandbox toolkit", () => {
  it("forwards operation context to sandbox execute options", async () => {
    const executeCalls: Array<Record<string, unknown>> = [];
    const workspace = new Workspace({
      sandbox: {
        name: "recording",
        status: "ready",
        async execute(options) {
          executeCalls.push(options as unknown as Record<string, unknown>);
          return {
            stdout: "",
            stderr: "",
            exitCode: 0,
            durationMs: 1,
            timedOut: false,
            aborted: false,
            stdoutTruncated: false,
            stderrTruncated: false,
          };
        },
      },
      filesystem: {},
    });

    const toolkit = createWorkspaceSandboxToolkit({
      sandbox: workspace.sandbox,
      workspace,
      filesystem: workspace.filesystem,
    });

    const executeTool = toolkit.tools.find((tool) => tool.name === "execute_command");
    if (!executeTool?.execute) {
      throw new Error("execute_command tool not found");
    }

    const executeOptions = buildExecuteOptions() as any;
    await executeTool.execute({ command: "echo", args: ["ok"] }, executeOptions);

    expect(executeCalls).toHaveLength(1);
    expect(executeCalls[0]?.operationContext).toBe(executeOptions);
  });

  it("evicts large stdout to workspace files", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "voltagent-sandbox-"));
    const sandbox = new LocalSandbox({ rootDir: tempDir });
    const workspace = new Workspace({
      sandbox,
      filesystem: {},
    });

    const toolkit = createWorkspaceSandboxToolkit(
      {
        sandbox: workspace.sandbox,
        workspace,
        filesystem: workspace.filesystem,
      },
      {
        outputEvictionBytes: 10,
        outputEvictionPath: "/sandbox_results",
      },
    );

    const executeTool = toolkit.tools.find((tool) => tool.name === "execute_command");
    if (!executeTool?.execute) {
      throw new Error("execute_command tool not found");
    }

    const script = "console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')";
    const result = await executeTool.execute(
      { command: process.execPath, args: ["-e", script] },
      buildExecuteOptions() as any,
    );

    expect(String(result)).toContain("saved to /sandbox_results/tool-call-1.stdout.txt");

    const saved = await workspace.filesystem.read("/sandbox_results/tool-call-1.stdout.txt");
    expect(saved).toContain("aaaaaaaa");

    sandbox.destroy();
    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
