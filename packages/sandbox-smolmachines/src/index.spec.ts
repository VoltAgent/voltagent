import type { ExecEvent, ExecOptions } from "smolmachines";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("smolmachines", () => ({ Machine: { create } }));

import { SmolMachinesSandbox } from "./index";

// A fake machine whose stream yields `events`, or hangs until its signal fires when `hang` is set.
const fakeMachine = (events: ExecEvent[], hang = false) => ({
  execStream: vi.fn(async function* (_argv: string[], opts?: ExecOptions) {
    yield* events;
    if (hang) {
      await new Promise((_, reject) => {
        opts?.signal?.addEventListener("abort", () => reject(new Error("killed")));
      });
    }
  }),
  delete: vi.fn(async () => undefined),
});

describe("SmolMachinesSandbox", () => {
  beforeEach(() => {
    create.mockReset();
  });

  it("runs the normalized command with merged env and cwd, whatever the callbacks throw", async () => {
    const machine = fakeMachine([
      { kind: "stdout", data: "hello\n" },
      { kind: "stderr", data: "warn\n" },
      { kind: "exit", exitCode: 3 },
    ]);
    create.mockResolvedValue(machine);
    const sandbox = new SmolMachinesSandbox({
      config: { image: "alpine" },
      env: { A: "1", B: "1" },
      cwd: "/work",
    });
    const onStdout = vi.fn(() => {
      throw new Error("ui gone");
    });
    const onStderr = vi.fn();

    const result = await sandbox.execute({
      command: "echo 'a b'",
      args: ["c"],
      env: { B: "2" },
      onStdout,
      onStderr,
    });

    expect(create).toHaveBeenCalledWith({ image: "alpine" }, { target: "local" });
    expect(machine.execStream.mock.calls[0][0]).toEqual(["echo", "a b", "c"]);
    expect(machine.execStream.mock.calls[0][1]).toMatchObject({
      env: { A: "1", B: "2" },
      workdir: "/work",
    });
    expect(onStdout).toHaveBeenCalledWith("hello\n");
    expect(onStderr).toHaveBeenCalledWith("warn\n");
    expect(result).toMatchObject({
      stdout: "hello\n",
      stderr: "warn\n",
      exitCode: 3,
      timedOut: false,
      aborted: false,
      stdoutTruncated: false,
      stderrTruncated: false,
    });
    await sandbox.execute({ command: "pwd", cwd: "/override" });
    expect(machine.execStream.mock.calls[1][1]?.workdir).toBe("/override");
    // The streaming exec would drop it, so the command must not run with empty stdin.
    await expect(sandbox.execute({ command: "cat", stdin: "in" })).rejects.toThrow("stdin");
    expect(machine.execStream).toHaveBeenCalledTimes(2);
  });

  it("keeps at most maxOutputBytes of each stream, cut at a whole character, and flags the cut", async () => {
    create.mockResolvedValue(
      fakeMachine([
        { kind: "stdout", data: "abc" },
        { kind: "stdout", data: "def" },
        { kind: "exit", exitCode: 0 },
      ]),
    );
    const sandbox = new SmolMachinesSandbox({ maxOutputBytes: 4 });

    const result = await sandbox.execute({ command: "cat" });

    expect(result).toMatchObject({ stdout: "abcd", stdoutTruncated: true, stderrTruncated: false });
    create.mockResolvedValue(
      fakeMachine([
        { kind: "stdout", data: "ab\u20ac" },
        { kind: "stdout", data: "c" },
        { kind: "exit", exitCode: 0 },
      ]),
    );
    // "\u20ac" is three bytes and only two fit, so the cut falls before it and nothing follows the gap.
    const cut = await new SmolMachinesSandbox({ maxOutputBytes: 4 }).execute({ command: "cat" });
    expect(cut).toMatchObject({ stdout: "ab", stdoutTruncated: true });
  });

  it("returns the kept output marked truncated when the engine's output cap ends the stream", async () => {
    create.mockResolvedValue(
      fakeMachine([
        { kind: "stdout", data: "abcdef" },
        {
          kind: "error",
          message:
            "streaming output exceeded 11534336 byte cap; exec terminated (output truncated)",
        },
      ]),
    );
    const sandbox = new SmolMachinesSandbox({ maxOutputBytes: 4 });

    const result = await sandbox.execute({ command: "yes" });

    expect(result).toMatchObject({
      stdout: "abcd",
      stderr: "",
      exitCode: null,
      stdoutTruncated: true,
      stderrTruncated: true,
    });
    // Any other engine error still fails the call.
    create.mockResolvedValue(fakeMachine([{ kind: "error", message: "agent unreachable" }]));
    await expect(new SmolMachinesSandbox().execute({ command: "yes" })).rejects.toThrow(
      "agent unreachable",
    );
  });

  const timeout = () => ({ timeoutMs: 20 });
  const abort = () => ({ signal: AbortSignal.timeout(20) });
  it.each([
    ["the timeout fires while it runs", timeout, false, { timedOut: true, aborted: false }],
    ["the caller aborts while it runs", abort, false, { timedOut: false, aborted: true }],
    ["the timeout fires while the machine boots", timeout, true, { timedOut: true }],
    ["the caller aborts while the machine boots", abort, true, { aborted: true }],
  ])("stops the call when %s", async (_case, options, booting, expected) => {
    const machine = fakeMachine([{ kind: "stdout", data: "partial" }], true);
    let boot: (value: unknown) => void = () => undefined;
    create.mockReturnValue(
      booting
        ? new Promise((resolve) => {
            boot = resolve;
          })
        : Promise.resolve(machine),
    );
    const sandbox = new SmolMachinesSandbox({ defaultTimeoutMs: 0 });

    const result = await sandbox.execute({ command: "sleep", ...options() });

    expect(result).toMatchObject({ exitCode: null, ...expected });
    if (booting) {
      // The machine finishing its boot later must not start the abandoned command.
      boot(machine);
      await sandbox.getSandbox();
      expect(machine.execStream).not.toHaveBeenCalled();
    } else {
      expect(result.stdout).toBe("partial");
      expect(machine.execStream.mock.calls[0][1]?.signal?.aborted).toBe(true);
    }
  });

  it("creates one machine across calls, retries a failed create and replaces it after destroy", async () => {
    const first = fakeMachine([{ kind: "exit", exitCode: 0 }]);
    const second = fakeMachine([{ kind: "exit", exitCode: 0 }]);
    create
      .mockRejectedValueOnce(new Error("boot failed"))
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const sandbox = new SmolMachinesSandbox();

    await expect(sandbox.execute({ command: "true" })).rejects.toThrow("boot failed");
    await Promise.all([sandbox.execute({ command: "true" }), sandbox.execute({ command: "true" })]);
    expect(create).toHaveBeenCalledTimes(2);
    expect(first.execStream).toHaveBeenCalledTimes(2);

    await sandbox.destroy();
    expect(first.delete).toHaveBeenCalledTimes(1);
    expect(await sandbox.getSandbox()).toBe(second);
  });
});
