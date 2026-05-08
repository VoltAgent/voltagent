import * as blaxelCore from "@blaxel/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlaxelSandbox, type BlaxelSandboxInstance } from "./index";
import { truncateOutput } from "./output";
import { applyEnvBindings } from "./shell";

interface ExecRequest {
  name: string;
  command: string;
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

interface GetResponse {
  status: "running" | "completed" | "failed" | "killed" | "stopped";
  exitCode?: number;
}

interface Mock {
  execCalls: ExecRequest[];
  waitCalls: Array<{ name: string; maxWait?: number; interval?: number }>;
  killed: string[];
  deleteCalls: number;
  closeCalls: number;
  stdoutLog: string;
  stderrLog: string;
  /**
   * Final state returned by `get()`. Defaults to completed/exitCode 0.
   */
  finalState: GetResponse;
  /**
   * When set, `wait()` rejects with this error to simulate timeout/failure.
   */
  waitError?: Error;
  /**
   * When set, the next `get()` call rejects with this error.
   */
  getError?: Error;
  /**
   * When set, the next `logs()` call rejects with this error.
   */
  logsError?: Error;
  /**
   * When true, calling `started.close()` throws — exercises the swallow guard.
   */
  closeShouldThrow?: boolean;
  /**
   * When set, `kill()` rejects after recording the call — exercises the silent-kill swallow.
   */
  killError?: Error;
  instance: BlaxelSandboxInstance;
}

function makeMock(): Mock {
  const state: Mock = {
    execCalls: [],
    waitCalls: [],
    killed: [],
    deleteCalls: 0,
    closeCalls: 0,
    stdoutLog: "",
    stderrLog: "",
    finalState: { status: "completed", exitCode: 0 },
    instance: null as unknown as BlaxelSandboxInstance,
  };

  async function exec(request: ExecRequest) {
    state.execCalls.push(request);
    // Mirror the SDK behavior: when callbacks are passed, attach a `close()` handle.
    if (request.onStdout || request.onStderr) {
      return {
        name: request.name,
        close: () => {
          state.closeCalls += 1;
          if (state.closeShouldThrow) throw new Error("boom");
        },
      };
    }
    return { name: request.name };
  }

  async function wait(name: string, opts?: { maxWait?: number; interval?: number }) {
    state.waitCalls.push({ name, maxWait: opts?.maxWait, interval: opts?.interval });
    if (state.waitError) throw state.waitError;
    return state.finalState;
  }

  async function get(_name: string) {
    if (state.getError) {
      const err = state.getError;
      state.getError = undefined;
      throw err;
    }
    return state.finalState;
  }

  async function logs(_name: string, type: "stdout" | "stderr" | "all") {
    if (state.logsError) {
      const err = state.logsError;
      state.logsError = undefined;
      throw err;
    }
    if (type === "stdout") return state.stdoutLog;
    if (type === "stderr") return state.stderrLog;
    return `${state.stdoutLog}${state.stderrLog}`;
  }

  async function kill(name: string) {
    state.killed.push(name);
    if (state.killError) {
      throw state.killError;
    }
  }

  async function deleteSandbox() {
    state.deleteCalls += 1;
  }

  state.instance = {
    process: { exec, wait, get, logs, kill },
    delete: deleteSandbox,
  } as unknown as BlaxelSandboxInstance;

  return state;
}

function spyCreate(instance: BlaxelSandboxInstance) {
  return vi
    .spyOn(blaxelCore.SandboxInstance, "createIfNotExists")
    .mockResolvedValue(instance as unknown as InstanceType<typeof blaxelCore.SandboxInstance>);
}

beforeEach(() => {
  vi.restoreAllMocks();
  // biome-ignore lint/performance/noDelete: removing the property; assigning undefined coerces to string "undefined".
  delete process.env.BL_API_KEY;
  // biome-ignore lint/performance/noDelete: removing the property; assigning undefined coerces to string "undefined".
  delete process.env.BL_WORKSPACE;
  // biome-ignore lint/performance/noDelete: removing the property; assigning undefined coerces to string "undefined".
  delete process.env.BL_REGION;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BlaxelSandbox constructor", () => {
  it("forwards apiKey and workspace to process.env", () => {
    new BlaxelSandbox({ apiKey: "k", workspace: "w" });
    expect(process.env.BL_API_KEY).toBe("k");
    expect(process.env.BL_WORKSPACE).toBe("w");
  });

  it("leaves process.env untouched when those options are absent", () => {
    new BlaxelSandbox();
    expect(process.env.BL_API_KEY).toBeUndefined();
    expect(process.env.BL_WORKSPACE).toBeUndefined();
  });

  it("normalizes per-call env, dropping undefined and null entries", async () => {
    const mock = makeMock();
    mock.stdoutLog = "ok";
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({
      command: "ls",
      env: { KEEP: "yes", DROP: undefined, NULLISH: null } as unknown as Record<string, string>,
    });
    expect(mock.execCalls[0].env).toEqual({ KEEP: "yes" });
  });
});

describe("BlaxelSandbox.execute (happy path)", () => {
  it("forwards command, env, and workingDir natively to exec()", async () => {
    const mock = makeMock();
    mock.stdoutLog = "hello\n";
    const sandbox = new BlaxelSandbox({
      sandbox: mock.instance,
      config: { cwd: "/tmp" },
    });

    const result = await sandbox.execute({
      command: "echo",
      args: ["hi"],
      env: { FOO: "bar" },
    });

    expect(mock.execCalls).toHaveLength(1);
    expect(mock.execCalls[0].command).toBe("echo hi");
    expect(mock.execCalls[0].workingDir).toBe("/tmp");
    expect(mock.execCalls[0].env).toEqual({ FOO: "bar" });
    expect(mock.execCalls[0].timeout).toBe(0);
    expect(mock.execCalls[0].name).toMatch(/^voltagent-/);

    expect(result.stdout).toBe("hello\n");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.aborted).toBe(false);
    expect(result.stdoutTruncated).toBe(false);
    expect(result.stderrTruncated).toBe(false);
  });

  it("escapes unsafe shell characters in command/args", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({ command: "echo", args: ["hello world", "$DANGER"] });
    expect(mock.execCalls[0].command).toBe("echo 'hello world' '$DANGER'");
  });

  it("renders empty-string args as the empty quoted token", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({ command: "echo", args: ["", "tail"] });
    expect(mock.execCalls[0].command).toBe("echo '' tail");
  });

  it("forwards per-call env to exec(), dropping undefined entries", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({
      command: "ls",
      env: { A: "one", B: "two", DROP: undefined } as unknown as Record<string, string>,
    });
    expect(mock.execCalls[0].env).toEqual({ A: "one", B: "two" });
  });

  it("passes env as undefined when no env vars are set", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({ command: "ls" });
    expect(mock.execCalls[0].env).toBeUndefined();
  });

  it("falls back to constructor cwd when per-call cwd is omitted", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance, config: { cwd: "/home" } });
    await sandbox.execute({ command: "ls" });
    expect(mock.execCalls[0].workingDir).toBe("/home");
  });

  it("per-call cwd overrides constructor cwd", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance, config: { cwd: "/home" } });
    await sandbox.execute({ command: "ls", cwd: "/var" });
    expect(mock.execCalls[0].workingDir).toBe("/var");
  });

  it("passes workingDir as undefined when neither constructor nor per-call cwd is set", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({ command: "ls" });
    expect(mock.execCalls[0].workingDir).toBeUndefined();
  });

  it("forwards onStdout and onStderr callbacks to the SDK", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const onStdout = vi.fn();
    const onStderr = vi.fn();

    await sandbox.execute({ command: "ls", onStdout, onStderr });

    expect(mock.execCalls[0].onStdout).toBe(onStdout);
    expect(mock.execCalls[0].onStderr).toBe(onStderr);
    // Callbacks attached → SDK returned a `close()` handle which we must invoke.
    expect(mock.closeCalls).toBe(1);
  });

  it("does not attach close() when no streaming callbacks are passed", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({ command: "ls" });
    expect(mock.closeCalls).toBe(0);
  });

  it("swallows errors thrown by close() so cleanup never escapes execute()", async () => {
    const mock = makeMock();
    mock.closeShouldThrow = true;
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await expect(sandbox.execute({ command: "ls", onStdout: () => {} })).resolves.toMatchObject({
      exitCode: 0,
    });
    expect(mock.closeCalls).toBe(1);
  });

  it("returns null exitCode when terminal status payload has no numeric exit code", async () => {
    const mock = makeMock();
    mock.finalState = { status: "completed" };
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const result = await sandbox.execute({ command: "ls" });
    expect(result.exitCode).toBe(null);
  });

  it("uses the configured pollIntervalMs as wait() interval", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({
      sandbox: mock.instance,
      config: { pollIntervalMs: 75, defaultTimeoutMs: 5000 },
    });
    await sandbox.execute({ command: "ls" });
    expect(mock.waitCalls[0].interval).toBe(75);
    expect(mock.waitCalls[0].maxWait).toBe(5000);
  });
});

describe("BlaxelSandbox.execute (timeout, abort, truncation)", () => {
  it("flips timedOut and kills the process when wait() rejects", async () => {
    const mock = makeMock();
    mock.waitError = new Error("Process did not finish in time");
    mock.stdoutLog = "partial";
    const sandbox = new BlaxelSandbox({
      sandbox: mock.instance,
      config: { defaultTimeoutMs: 100 },
    });

    const result = await sandbox.execute({ command: "tail" });

    expect(result.timedOut).toBe(true);
    expect(result.aborted).toBe(false);
    expect(mock.killed).toContain(mock.execCalls[0].name);
    expect(result.stdout).toBe("partial");
  });

  it("swallows errors thrown by kill() during the timeout path", async () => {
    const mock = makeMock();
    mock.waitError = new Error("Process did not finish in time");
    mock.killError = new Error("kill failed");
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance, config: { defaultTimeoutMs: 50 } });

    const result = await sandbox.execute({ command: "tail" });

    expect(result.timedOut).toBe(true);
    expect(mock.killed).toContain(mock.execCalls[0].name);
  });

  it("uses the 24h safety cap when timeoutMs is 0", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance, config: { defaultTimeoutMs: 0 } });
    await sandbox.execute({ command: "ls" });
    expect(mock.waitCalls[0].maxWait).toBe(24 * 60 * 60 * 1000);
  });

  it("clamps a negative per-call timeoutMs to zero (uses safety cap)", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({ command: "ls", timeoutMs: -50 });
    expect(mock.waitCalls[0].maxWait).toBe(24 * 60 * 60 * 1000);
  });

  it("returns immediately on a pre-aborted AbortSignal without calling exec()", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const result = await sandbox.execute({ command: "ls", signal: AbortSignal.abort() });
    expect(result.aborted).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(mock.execCalls).toHaveLength(0);
  });

  it("kills the process when the AbortSignal fires mid-flight", async () => {
    const mock = makeMock();
    const controller = new AbortController();
    let waitResolve: (value: GetResponse) => void = () => {};
    mock.instance.process.wait = ((name: string) => {
      mock.waitCalls.push({ name });
      return new Promise<GetResponse>((resolve) => {
        waitResolve = resolve;
      });
    }) as unknown as BlaxelSandboxInstance["process"]["wait"];

    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const promise = sandbox.execute({ command: "tail", signal: controller.signal });
    // Let exec + wait start
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();
    waitResolve(mock.finalState);
    const result = await promise;

    expect(result.aborted).toBe(true);
    expect(mock.killed).toContain(mock.execCalls[0].name);
  });

  it("removes the abort listener in finally", async () => {
    const mock = makeMock();
    const controller = new AbortController();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await sandbox.execute({ command: "ls", signal: controller.signal });
    // After execute() returns, aborting should not call kill again.
    controller.abort();
    expect(mock.killed).toHaveLength(0);
  });

  it("truncates stdout when output exceeds maxOutputBytes", async () => {
    const mock = makeMock();
    mock.stdoutLog = "x".repeat(50);
    const sandbox = new BlaxelSandbox({
      sandbox: mock.instance,
      config: { maxOutputBytes: 10 },
    });
    const result = await sandbox.execute({ command: "ls" });
    expect(result.stdout).toBe("x".repeat(10));
    expect(result.stdoutTruncated).toBe(true);
  });

  it("truncates stderr when output exceeds per-call maxOutputBytes", async () => {
    const mock = makeMock();
    mock.stderrLog = "y".repeat(20);
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const result = await sandbox.execute({ command: "ls", maxOutputBytes: 5 });
    expect(result.stderr).toBe("y".repeat(5));
    expect(result.stderrTruncated).toBe(true);
  });

  it("flags truncation immediately when maxOutputBytes is 0", async () => {
    const mock = makeMock();
    mock.stdoutLog = "anything";
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance, config: { maxOutputBytes: 0 } });
    const result = await sandbox.execute({ command: "ls" });
    expect(result.stdout).toBe("");
    expect(result.stdoutTruncated).toBe(true);
  });

  it("clamps a negative maxOutputBytes to zero", async () => {
    const mock = makeMock();
    mock.stdoutLog = "anything";
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const result = await sandbox.execute({ command: "ls", maxOutputBytes: -10 });
    expect(result.stdout).toBe("");
    expect(result.stdoutTruncated).toBe(true);
  });

  it("returns null exitCode in the zero-output path when get() throws", async () => {
    const mock = makeMock();
    mock.getError = new Error("gone");
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance, config: { maxOutputBytes: 0 } });
    const result = await sandbox.execute({ command: "ls" });
    expect(result.exitCode).toBe(null);
    expect(result.stdoutTruncated).toBe(true);
  });

  it("returns empty output without truncation flag when log is empty", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const result = await sandbox.execute({ command: "ls" });
    expect(result.stdout).toBe("");
    expect(result.stdoutTruncated).toBe(false);
  });
});

describe("BlaxelSandbox.execute (validation and post-state robustness)", () => {
  it("rejects when stdin is provided", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await expect(sandbox.execute({ command: "cat", stdin: "input" })).rejects.toThrow(
      "Workspace sandbox does not support stdin for this command.",
    );
  });

  it("rejects when the command is empty/whitespace", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await expect(sandbox.execute({ command: "   " })).rejects.toThrow(
      "Sandbox command is required",
    );
  });

  it("rejects when no command is provided at all", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    await expect(
      sandbox.execute({} as unknown as Parameters<BlaxelSandbox["execute"]>[0]),
    ).rejects.toThrow("Sandbox command is required");
  });

  it("returns null exitCode + empty output when get() throws", async () => {
    const mock = makeMock();
    mock.getError = new Error("gone");
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const result = await sandbox.execute({ command: "ls" });
    expect(result.exitCode).toBe(null);
    expect(result.stdout).toBe("");
  });

  it("falls through to empty stdout/stderr when logs() throws", async () => {
    const mock = makeMock();
    mock.logsError = new Error("logs gone");
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const result = await sandbox.execute({ command: "ls" });
    expect(result.stdout).toBe("");
  });

  it("falls through to empty stderr when the stderr logs() call fails", async () => {
    const mock = makeMock();
    mock.stdoutLog = "ok";
    // Throw only on the stderr fetch (second logs() call).
    let calls = 0;
    mock.instance.process.logs = (async (_name: string, type: "stdout" | "stderr" | "all") => {
      calls += 1;
      if (calls === 2) throw new Error("stderr fetch failed");
      return type === "stdout" ? mock.stdoutLog : mock.stderrLog;
    }) as unknown as BlaxelSandboxInstance["process"]["logs"];

    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const result = await sandbox.execute({ command: "ls" });
    expect(result.stdout).toBe("ok");
    expect(result.stderr).toBe("");
  });

  it("truncateOutput flags truncated when maxBytes <= 0 and value is non-empty", () => {
    expect(truncateOutput("hello", 0)).toEqual({ content: "", truncated: true });
    expect(truncateOutput("hello", -10)).toEqual({ content: "", truncated: true });
  });
});

describe("applyEnvBindings", () => {
  it("writes non-nil bindings to the target object", () => {
    const target: Record<string, string | undefined> = {};
    applyEnvBindings({ A: "one", B: "two" }, target);
    expect(target).toEqual({ A: "one", B: "two" });
  });

  it("skips bindings whose value is null or undefined", () => {
    const target: Record<string, string | undefined> = { EXISTING: "keep" };
    applyEnvBindings({ A: "set", B: undefined, C: null as unknown as string, D: "" }, target);
    expect(target).toEqual({ EXISTING: "keep", A: "set", D: "" });
    expect(target).not.toHaveProperty("B");
    expect(target).not.toHaveProperty("C");
  });

  it("does not delete existing keys when binding value is nullish", () => {
    const target: Record<string, string | undefined> = { A: "preset" };
    applyEnvBindings({ A: undefined }, target);
    expect(target.A).toBe("preset");
  });

  it("defaults to mutating process.env when no target is provided", () => {
    applyEnvBindings({ TEST_BLAXEL_BINDING: "applied" });
    expect(process.env.TEST_BLAXEL_BINDING).toBe("applied");
    // biome-ignore lint/performance/noDelete: clean up the side-effect for later tests.
    delete process.env.TEST_BLAXEL_BINDING;
  });
});

describe("BlaxelSandbox lazy creation, getSandbox, destroy, getInfo", () => {
  it("forwards config to createIfNotExists when name is provided", async () => {
    const mock = makeMock();
    const ifNotExists = spyCreate(mock.instance);

    const sandbox = new BlaxelSandbox({
      config: { name: "voltagent-prod", image: "blaxel/base:latest" },
    });
    await sandbox.execute({ command: "ls" });

    expect(ifNotExists).toHaveBeenCalledOnce();
    expect(ifNotExists.mock.calls[0][0]).toMatchObject({
      name: "voltagent-prod",
      image: "blaxel/base:latest",
    });
  });

  it("calls createIfNotExists with an empty object when no config is provided", async () => {
    const mock = makeMock();
    const ifNotExists = spyCreate(mock.instance);

    const sandbox = new BlaxelSandbox();
    await sandbox.execute({ command: "ls" });

    expect(ifNotExists).toHaveBeenCalledOnce();
    expect(ifNotExists.mock.calls[0][0]).toEqual({});
  });

  it("strips voltagent-specific config keys before forwarding to the SDK", async () => {
    const mock = makeMock();
    const ifNotExists = spyCreate(mock.instance);

    const sandbox = new BlaxelSandbox({
      config: {
        name: "voltagent-prod",
        image: "blaxel/base:latest",
        cwd: "/workspace",
        defaultTimeoutMs: 30_000,
        maxOutputBytes: 1024,
        pollIntervalMs: 100,
      },
    });
    await sandbox.execute({ command: "ls" });

    expect(ifNotExists.mock.calls[0][0]).toEqual({
      name: "voltagent-prod",
      image: "blaxel/base:latest",
    });
  });

  it("memoizes resolved sandbox across executes (one SDK call)", async () => {
    const mock = makeMock();
    const ifNotExists = spyCreate(mock.instance);

    const sandbox = new BlaxelSandbox({ config: { image: "blaxel/base:latest" } });
    await sandbox.execute({ command: "ls" });
    await sandbox.execute({ command: "ls" });
    await sandbox.execute({ command: "ls" });

    expect(ifNotExists).toHaveBeenCalledOnce();
  });

  it("retries provisioning on a subsequent execute after a failure", async () => {
    const mock = makeMock();
    const ifNotExists = vi
      .spyOn(blaxelCore.SandboxInstance, "createIfNotExists")
      .mockRejectedValueOnce(new Error("create failed"))
      .mockResolvedValueOnce(
        mock.instance as unknown as InstanceType<typeof blaxelCore.SandboxInstance>,
      );

    const sandbox = new BlaxelSandbox({ config: { image: "blaxel/base:latest" } });
    await expect(sandbox.execute({ command: "ls" })).rejects.toThrow("create failed");
    const result = await sandbox.execute({ command: "ls" });

    expect(ifNotExists).toHaveBeenCalledTimes(2);
    expect(result.exitCode).toBe(0);
  });

  it("forwards memory, ttl, ports, labels into create params", async () => {
    const mock = makeMock();
    const ifNotExists = spyCreate(mock.instance);

    const sandbox = new BlaxelSandbox({
      config: {
        name: "voltagent-prod",
        image: "blaxel/python:latest",
        memory: 1024,
        region: "us-east-1",
        ttl: "600s",
        ports: [{ name: "http", target: 8080, protocol: "TCP" }],
        labels: { team: "voltagent" },
      },
    });
    await sandbox.execute({ command: "ls" });

    expect(ifNotExists.mock.calls[0][0]).toEqual({
      name: "voltagent-prod",
      image: "blaxel/python:latest",
      memory: 1024,
      region: "us-east-1",
      ttl: "600s",
      ports: [{ name: "http", target: 8080, protocol: "TCP" }],
      labels: { team: "voltagent" },
    });
  });

  it("getSandbox() returns the injected instance by reference", async () => {
    const mock = makeMock();
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    const resolved = await sandbox.getSandbox();
    expect(resolved).toBe(mock.instance);
  });

  it("destroy() calls sandbox.delete() and clears the cached instance", async () => {
    const mock = makeMock();
    const ifNotExists = spyCreate(mock.instance);

    const sandbox = new BlaxelSandbox({ config: { image: "blaxel/base:latest" } });
    await sandbox.execute({ command: "ls" });
    await sandbox.destroy();

    expect(mock.deleteCalls).toBe(1);
    // Next execute should re-provision.
    await sandbox.execute({ command: "ls" });
    expect(ifNotExists).toHaveBeenCalledTimes(2);
  });

  it("destroy() is a no-op when no sandbox has been provisioned", async () => {
    const sandbox = new BlaxelSandbox();
    await expect(sandbox.destroy()).resolves.toBeUndefined();
  });

  it("destroy() swallows rejection when the in-flight create promise fails", async () => {
    let rejectCreate!: (err: Error) => void;
    const pending = new Promise((_, reject) => {
      rejectCreate = reject;
    });
    vi.spyOn(blaxelCore.SandboxInstance, "createIfNotExists").mockImplementation(
      () => pending as ReturnType<typeof blaxelCore.SandboxInstance.createIfNotExists>,
    );

    const sandbox = new BlaxelSandbox({ config: { image: "blaxel/base:latest" } });
    // Kick off the in-flight promise via execute().
    const exec = sandbox.execute({ command: "ls" });
    // Yield so resolveSandbox starts the in-flight createAndCache promise.
    await Promise.resolve();

    // destroy() captures the in-flight promise and resets this.sandbox.
    const destroyPromise = sandbox.destroy();
    // Now reject the underlying create — both awaiters observe the rejection.
    rejectCreate(new Error("create failed"));

    await expect(destroyPromise).resolves.toBeUndefined();
    await expect(exec).rejects.toThrow("create failed");
  });

  it("destroy() swallows errors thrown by sandbox.delete()", async () => {
    const mock = makeMock();
    mock.instance = {
      ...mock.instance,
      delete: async () => {
        throw new Error("delete failed");
      },
    } as unknown as BlaxelSandboxInstance;
    const sandbox = new BlaxelSandbox({ sandbox: mock.instance });
    // Force the cache by calling getSandbox() first.
    await sandbox.getSandbox();
    await expect(sandbox.destroy()).resolves.toBeUndefined();
  });

  it("getInfo() returns the static descriptor shape", () => {
    const sandbox = new BlaxelSandbox({
      config: {
        name: "task-runner",
        image: "blaxel/base:latest",
        region: "us-east-1",
        memory: 2048,
      },
    });
    expect(sandbox.getInfo()).toEqual({
      provider: "blaxel",
      name: "task-runner",
      image: "blaxel/base:latest",
      region: "us-east-1",
      memory: 2048,
    });
  });

  it("getInfo() returns just provider when no config is set", () => {
    expect(new BlaxelSandbox().getInfo()).toEqual({ provider: "blaxel" });
  });

  it("getInfo() omits voltagent-specific config keys", () => {
    const sandbox = new BlaxelSandbox({
      config: {
        name: "x",
        cwd: "/tmp",
        defaultTimeoutMs: 1000,
        maxOutputBytes: 100,
        pollIntervalMs: 50,
      },
    });
    expect(sandbox.getInfo()).toEqual({ provider: "blaxel", name: "x" });
  });
});
