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
  it("normalizes full command line input into command + args", async () => {
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

    await executeTool.execute(
      { command: "mkdir -p /data/playwright/voltagent/screenshots" },
      buildExecuteOptions() as any,
    );

    expect(executeCalls).toHaveLength(1);
    expect(executeCalls[0]?.command).toBe("mkdir");
    expect(executeCalls[0]?.args).toEqual(["-p", "/data/playwright/voltagent/screenshots"]);
  });

  it("keeps quoted arguments while normalizing command + args", async () => {
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

    await executeTool.execute(
      {
        command:
          "npx -y @playwright/cli open 'https://en.wikipedia.org/wiki/Special:Search?search=VoltAgent'",
      },
      buildExecuteOptions() as any,
    );

    expect(executeCalls).toHaveLength(1);
    expect(executeCalls[0]?.command).toBe("npx");
    expect(executeCalls[0]?.args).toEqual([
      "-y",
      "@playwright/cli",
      "open",
      "https://en.wikipedia.org/wiki/Special:Search?search=VoltAgent",
    ]);
  });

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

    expect(result).toMatchObject({
      success: true,
      stdout: "",
      stdout_evicted_path: "/sandbox_results/tool-call-1.stdout.txt",
    });
    expect((result as any).summary).toContain("saved to /sandbox_results/tool-call-1.stdout.txt");

    const saved = await workspace.filesystem.read("/sandbox_results/tool-call-1.stdout.txt");
    expect(saved).toContain("aaaaaaaa");

    sandbox.destroy();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("injects path context into sandbox instructions and tool description", () => {
    const toolkit = createWorkspaceSandboxToolkit({
      pathContext: {
        filesystem: {
          instructions: "Filesystem root is /data.",
        },
        sandbox: {
          instructions: "Working directory defaults to /workspace.",
        },
      },
    });

    expect(toolkit.instructions).toContain("Path context");
    expect(toolkit.instructions).toContain("Filesystem: Filesystem root is /data.");
    expect(toolkit.instructions).toContain("Sandbox: Working directory defaults to /workspace.");

    const executeTool = toolkit.tools.find((tool) => tool.name === "execute_command");
    expect(executeTool?.description).toContain("Path context");
    expect(executeTool?.description).toContain("Filesystem: Filesystem root is /data.");
    expect(executeTool?.description).toContain(
      "Sandbox: Working directory defaults to /workspace.",
    );
  });
});
