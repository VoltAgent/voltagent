import { CommandTimeoutError } from "@tenkicloud/sandbox";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TenkiSandbox } from "./sandbox";
import { createTenkiToolkit } from "./tools";

const mocks = vi.hoisted(() => ({
  createAndWait: vi.fn(),
  clientClose: vi.fn(),
  clientCtor: vi.fn(),
}));

vi.mock("@tenkicloud/sandbox", () => {
  class CommandTimeoutError extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "CommandTimeoutError";
    }
  }
  class TenkiSandbox {
    createAndWait = mocks.createAndWait;
    close = mocks.clientClose;
    constructor(options: unknown) {
      mocks.clientCtor(options);
    }
  }
  return { TenkiSandbox, CommandTimeoutError };
});

const enc = new TextEncoder();

const concat = (chunks: Array<string | Uint8Array>): Uint8Array => {
  const buffers = chunks.map((c) =>
    typeof c === "string" ? Buffer.from(enc.encode(c)) : Buffer.from(c),
  );
  return new Uint8Array(Buffer.concat(buffers));
};

type HandleOptions = {
  stdout?: Array<string | Uint8Array>;
  stderr?: Array<string | Uint8Array>;
  exitCode?: number;
  signal?: string;
  durationMs?: number;
  reason?: string;
  errno?: number;
  hangUntilKill?: boolean;
  keepStreamsOpen?: boolean;
  killHangs?: boolean;
  killRejectWith?: unknown;
  killThrowsWith?: unknown;
  rejectWith?: unknown;
  errorStdout?: boolean;
};

const makeHandle = (options: HandleOptions = {}) => {
  const {
    stdout = [],
    stderr = [],
    exitCode = 0,
    signal,
    durationMs = 5,
    reason = "exit",
    errno = 0,
    hangUntilKill = false,
    keepStreamsOpen = false,
    killHangs = false,
    killRejectWith,
    killThrowsWith,
    rejectWith,
    errorStdout = false,
  } = options;

  let stdoutCtl!: ReadableStreamDefaultController<Uint8Array>;
  let stderrCtl!: ReadableStreamDefaultController<Uint8Array>;
  const stdoutStream = errorStdout
    ? new ReadableStream<Uint8Array>({
        start(controller) {
          stdoutCtl = controller;
          controller.error(new Error("stream boom"));
        },
      })
    : new ReadableStream<Uint8Array>({
        start(controller) {
          stdoutCtl = controller;
        },
      });
  const stderrStream = new ReadableStream<Uint8Array>({
    start(controller) {
      stderrCtl = controller;
    },
  });
  for (const chunk of stdout) {
    stdoutCtl.enqueue(typeof chunk === "string" ? enc.encode(chunk) : chunk);
  }
  for (const chunk of stderr) {
    stderrCtl.enqueue(typeof chunk === "string" ? enc.encode(chunk) : chunk);
  }

  const result = {
    exitCode,
    signal,
    durationMs,
    reason,
    errno,
    stdout: concat(stdout),
    stderr: concat(stderr),
  };

  let resolveResult!: (value: typeof result) => void;
  let rejectResult!: (reason: unknown) => void;
  const resultPromise = new Promise<typeof result>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const safeClose = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    try {
      controller.close();
    } catch {
      // controller may already be errored (errorStdout case)
    }
  };

  if (rejectWith !== undefined) {
    safeClose(stdoutCtl);
    safeClose(stderrCtl);
    rejectResult(rejectWith);
  } else if (!hangUntilKill) {
    if (!keepStreamsOpen) {
      safeClose(stdoutCtl);
      safeClose(stderrCtl);
    }
    resolveResult(result);
  }

  const kill =
    killThrowsWith !== undefined
      ? vi.fn(() => {
          throw killThrowsWith;
        })
      : vi.fn(async () => {
          if (killRejectWith !== undefined) {
            throw killRejectWith;
          }
          if (killHangs) {
            await new Promise<never>(() => {});
          }
          if (hangUntilKill) {
            safeClose(stdoutCtl);
            safeClose(stderrCtl);
            resolveResult({ ...result, signal: signal ?? "KILL" });
          }
        });

  const writeSpy = vi.fn();
  const stdin = new WritableStream<Uint8Array>({
    write(chunk) {
      writeSpy(chunk);
    },
  });

  return {
    stdout: stdoutStream,
    stderr: stderrStream,
    stdin,
    pid: Promise.resolve(1),
    signal: vi.fn(async () => {}),
    kill,
    // biome-ignore lint/suspicious/noThenProperty: mocking Tenki's PromiseLike ProcessRunHandle
    then<T, R>(
      onfulfilled?: ((value: typeof result) => T | PromiseLike<T>) | null,
      onrejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
    ) {
      return resultPromise.then(onfulfilled, onrejected);
    },
    _writeSpy: writeSpy,
    _rejectResult: rejectResult,
  };
};

const settlesWithin = async <T>(promise: Promise<T>, timeoutMs = 250): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`promise did not settle within ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const makeSession = (overrides: Record<string, unknown> = {}) => {
  const run = vi.fn(() => makeHandle({ stdout: ["ok\n"], exitCode: 0 }));
  return {
    id: "sess-123",
    state: "RUNNING",
    run,
    exposePort: vi.fn(async () => ({ port: 3000, previewUrl: "https://preview.tenki.cloud/abc" })),
    updateSshAuthorizedKeys: vi.fn(async () => {}),
    pause: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    ...overrides,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TenkiSandbox.execute", () => {
  it("runs a command and maps stdout + exitCode", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ stdout: ["hello\n"], exitCode: 0 })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "echo hello" });

    expect(result.stdout).toBe("hello\n");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.aborted).toBe(false);
    expect(result.stdoutTruncated).toBe(false);
    expect(session.run).toHaveBeenCalledWith(["echo", "hello"], expect.objectContaining({}));
  });

  it("maps a non-zero exit code and stderr", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ stderr: ["boom\n"], exitCode: 2 })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "false" });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe("boom\n");
  });

  it("surfaces an exec failure errno in stderr", async () => {
    // Tenki reports a fork/exec failure as a resolved run with empty stderr, so
    // the errno is the only thing that explains the exit code.
    const session = makeSession({
      run: vi.fn(() => makeHandle({ exitCode: 127, errno: 2, reason: "exec_failed" })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "nope" });

    expect(result.exitCode).toBe(127);
    expect(result.stderr).toBe("tenki: exec failed: ENOENT (errno 2), reason=exec_failed\n");
    expect(result.stderrTruncated).toBe(false);
  });

  it("appends the exec failure diagnostic after captured stderr", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ stderr: ["partial\n"], exitCode: 1, errno: 24 })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "spawn-storm" });

    expect(result.stderr).toBe("partial\ntenki: exec failed: EMFILE (errno 24)\n");
  });

  it("surfaces an abnormal exit reason that exitCode alone does not explain", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ exitCode: 137, reason: "oom_killed" })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "hog" });

    expect(result.stderr).toBe("tenki: run ended: reason=oom_killed\n");
  });

  it("leaves stderr untouched on a clean run", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ stdout: ["ok\n"], exitCode: 0, reason: "exit", errno: 0 })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "true" });

    expect(result.stderr).toBe("");
  });

  it("routes streamed chunks to onStdout/onStderr and merges signal", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ stdout: ["a"], stderr: ["b"], exitCode: 0, signal: "TERM" })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });
    const outChunks: string[] = [];
    const errChunks: string[] = [];

    const result = await sandbox.execute({
      command: "run",
      onStdout: (c) => outChunks.push(c),
      onStderr: (c) => errChunks.push(c),
    });

    expect(outChunks).toEqual(["a"]);
    expect(errChunks).toEqual(["b"]);
    expect(result.signal).toBe("TERM");
  });

  it("swallows errors thrown by streaming callbacks", async () => {
    const session = makeSession({ run: vi.fn(() => makeHandle({ stdout: ["a"] })) });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({
      command: "run",
      onStdout: () => {
        throw new Error("callback boom");
      },
    });

    expect(result.stdout).toBe("a");
  });

  it("forwards cwd and merged env to run", async () => {
    const run = vi.fn(() => makeHandle({ stdout: ["ok"] }));
    const session = makeSession({ run });
    const sandbox = new TenkiSandbox({
      session: session as never,
      env: { BASE: "1" },
      cwd: "/base",
    });

    await sandbox.execute({ command: "env", env: { EXTRA: "2" }, cwd: "/work" });

    expect(run).toHaveBeenCalledWith(["env"], {
      stdin: expect.any(ReadableStream),
      env: { BASE: "1", EXTRA: "2" },
      cwd: "/work",
    });
  });

  it("omits env and cwd when neither is set", async () => {
    const run = vi.fn(() => makeHandle({ stdout: ["ok"] }));
    const session = makeSession({ run });
    const sandbox = new TenkiSandbox({ session: session as never });

    await sandbox.execute({ command: "ls" });

    expect(run).toHaveBeenCalledWith(["ls"], { stdin: expect.any(ReadableStream) });
  });

  it("forwards stdin through the run stdin stream", async () => {
    const handle = makeHandle({ stdout: ["ok"] });
    const run = vi.fn(() => handle);
    const session = makeSession({ run });
    const sandbox = new TenkiSandbox({ session: session as never });

    await sandbox.execute({ command: "cat", stdin: "piped-input" });

    // The run() stdin option is a ReadableStream that carries the stdin bytes.
    const runCall = run.mock.calls[0] as unknown as [
      string[],
      { stdin: ReadableStream<Uint8Array> },
    ];
    const passedStdin = runCall[1].stdin;
    const reader = passedStdin.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe("piped-input");
  });

  it("truncates output beyond maxOutputBytes", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ stdout: ["abcdefghij"], exitCode: 0 })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "cat big", maxOutputBytes: 4 });

    expect(result.stdout).toBe("abcd");
    expect(result.stdoutTruncated).toBe(true);
  });

  it("throws when the command is empty", async () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never });
    await expect(sandbox.execute({ command: "   " })).rejects.toThrow(
      "Sandbox command is required",
    );
  });

  it("throws when the command is missing entirely", async () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never });
    await expect(sandbox.execute({ command: undefined as unknown as string })).rejects.toThrow(
      "Sandbox command is required",
    );
  });

  it("tolerates an output stream that errors mid-read", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ errorStdout: true, stderr: ["side"], exitCode: 0 })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "flaky" });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("side");
  });

  it("returns an aborted result when the signal is already aborted", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({ session: session as never });
    const controller = new AbortController();
    controller.abort();

    const result = await sandbox.execute({ command: "sleep 1", signal: controller.signal });

    expect(result.aborted).toBe(true);
    expect(result.exitCode).toBeNull();
    expect(session.run).not.toHaveBeenCalled();
  });

  it("aborts an in-flight command and kills the process", async () => {
    const handle = makeHandle({ hangUntilKill: true, stdout: ["partial"] });
    const session = makeSession({ run: vi.fn(() => handle) });
    const sandbox = new TenkiSandbox({ session: session as never });
    const controller = new AbortController();

    const promise = sandbox.execute({ command: "sleep 100", signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    const result = await promise;

    expect(result.aborted).toBe(true);
    expect(handle.kill).toHaveBeenCalled();
  });

  it("handles a synchronous abort from run and a synchronous kill failure", async () => {
    const controller = new AbortController();
    const reader = {
      read: vi.fn(() => new Promise<never>(() => {})),
      cancel: vi.fn(() => {
        throw new Error("cancel failed synchronously");
      }),
      releaseLock: vi.fn(),
    };
    const handle = {
      ...makeHandle({
        rejectWith: new CommandTimeoutError("late timeout"),
        killThrowsWith: new Error("kill failed synchronously"),
      }),
      stdout: {
        getReader: () => reader,
      } as unknown as ReadableStream<Uint8Array>,
    };
    const session = makeSession({
      run: vi.fn(() => {
        controller.abort();
        return handle;
      }),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "sleep 100", signal: controller.signal });

    expect(result.aborted).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(handle.kill).toHaveBeenCalledOnce();
    expect(reader.cancel).toHaveBeenCalledOnce();
  });

  it("keeps the first cancellation reason when run throws after aborting", async () => {
    const controller = new AbortController();
    const session = makeSession({
      run: vi.fn(() => {
        controller.abort();
        throw new CommandTimeoutError("run timed out after abort");
      }),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "sleep 100", signal: controller.signal });

    expect(result.aborted).toBe(true);
    expect(result.timedOut).toBe(false);
  });

  it("times out a long-running command and kills the process", async () => {
    const handle = makeHandle({ hangUntilKill: true });
    const session = makeSession({ run: vi.fn(() => handle) });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "sleep 100", timeoutMs: 20 });

    expect(result.timedOut).toBe(true);
    expect(handle.kill).toHaveBeenCalled();
  });

  it("settles on timeout when the run, streams, and kill never settle", async () => {
    const handle = makeHandle({
      stdout: ["partial"],
      hangUntilKill: true,
      killHangs: true,
    });
    const session = makeSession({ run: vi.fn(() => handle) });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await settlesWithin(sandbox.execute({ command: "sleep 100", timeoutMs: 10 }));

    expect(result.timedOut).toBe(true);
    expect(result.aborted).toBe(false);
    expect(result.exitCode).toBeNull();
    expect(result.stdout).toBe("partial");
    expect(handle.kill).toHaveBeenCalledOnce();
  });

  it("settles on abort and contains late run and kill rejections", async () => {
    const handle = makeHandle({
      stdout: ["partial"],
      hangUntilKill: true,
      killRejectWith: new Error("kill failed"),
    });
    const session = makeSession({ run: vi.fn(() => handle) });
    const sandbox = new TenkiSandbox({ session: session as never });
    const controller = new AbortController();

    const promise = sandbox.execute({ command: "sleep 100", signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const result = await settlesWithin(promise);

    expect(result.aborted).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toBe("partial");
    expect(handle.kill).toHaveBeenCalledOnce();

    // A run failure arriving after execute() returned must remain observed.
    handle._rejectResult(new Error("late run failure"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("settles when output streams remain open after the run completes", async () => {
    const handle = makeHandle({ stdout: ["complete"], keepStreamsOpen: true, killHangs: true });
    const session = makeSession({ run: vi.fn(() => handle) });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await settlesWithin(
      sandbox.execute({ command: "echo complete", timeoutMs: 10 }),
    );

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("complete");
    expect(handle.kill).toHaveBeenCalledOnce();
  });

  it("tolerates a stream reader whose releaseLock throws", async () => {
    const reader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn().mockResolvedValue(undefined),
      releaseLock: vi.fn(() => {
        throw new Error("release failed");
      }),
    };
    const handle = {
      ...makeHandle(),
      stdout: {
        getReader: () => reader,
      } as unknown as ReadableStream<Uint8Array>,
    };
    const session = makeSession({ run: vi.fn(() => handle) });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "echo ok" });

    expect(result.exitCode).toBe(0);
    expect(reader.releaseLock).toHaveBeenCalledOnce();
  });

  it("treats a CommandTimeoutError as a timeout", async () => {
    const session = makeSession({
      run: vi.fn(() => makeHandle({ rejectWith: new CommandTimeoutError("deadline") })),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const result = await sandbox.execute({ command: "slow" });

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
  });

  it("rethrows unexpected errors", async () => {
    const session = makeSession({
      run: vi.fn(() => {
        throw new Error("network down");
      }),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    await expect(sandbox.execute({ command: "boom" })).rejects.toThrow("network down");
  });

  it("disables the timeout when timeoutMs is 0", async () => {
    const run = vi.fn(() => makeHandle({ stdout: ["ok"] }));
    const session = makeSession({ run });
    const sandbox = new TenkiSandbox({ session: session as never, defaultTimeoutMs: 0 });

    const result = await sandbox.execute({ command: "ok" });

    expect(result.timedOut).toBe(false);
    expect(result.stdout).toBe("ok");
  });

  it("reassembles a multi-byte code point split across stream chunks", async () => {
    const session = makeSession();
    // "😀" (U+1F600) = F0 9F 98 80, delivered split across two stream chunks.
    session.run.mockReturnValue(
      makeHandle({
        stdout: [new Uint8Array([0xf0, 0x9f]), new Uint8Array([0x98, 0x80])],
        exitCode: 0,
      }),
    );
    mocks.createAndWait.mockResolvedValue(session);
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const chunks: string[] = [];
    const result = await sandbox.execute({
      command: "echo",
      onStdout: (chunk) => chunks.push(chunk),
    });

    // Incremental decoding buffers the partial code point instead of emitting
    // replacement characters on each chunk boundary.
    expect(chunks.join("")).toBe("😀");
    expect(result.stdout).toBe("😀");
  });

  it("settles as timed out while provisioning is still pending", async () => {
    // createAndWait never resolves during this test: the only way execute()
    // can settle is by racing provisioning against the timeout.
    mocks.createAndWait.mockReturnValue(new Promise<never>(() => {}));
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const result = await sandbox.execute({ command: "echo hi", timeoutMs: 10 });

    expect(result.timedOut).toBe(true);
    expect(result.aborted).toBe(false);
    expect(result.exitCode).toBeNull();
  });

  it("settles as aborted while provisioning is still pending", async () => {
    mocks.createAndWait.mockReturnValue(new Promise<never>(() => {}));
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });
    const controller = new AbortController();

    const promise = sandbox.execute({ command: "echo hi", signal: controller.signal });
    controller.abort();
    const result = await promise;

    expect(result.aborted).toBe(true);
    expect(result.exitCode).toBeNull();
  });

  it("settles as aborted when the client hands back no session", async () => {
    mocks.createAndWait.mockResolvedValue(undefined);
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const result = await sandbox.execute({ command: "echo hi" });

    expect(result.aborted).toBe(true);
    expect(result.exitCode).toBeNull();
  });

  // `session.resume()` is a network RPC, so a timeout/abort can land while it is
  // in flight — before `handle` exists, which makes requestKill() a no-op. The
  // command must not be launched at all in that window.
  it("settles as timed out when the timeout fires while resuming", async () => {
    const session = makeSession({
      resume: vi.fn(() => new Promise<void>(() => {})),
    });
    const sandbox = new TenkiSandbox({ session: session as never });
    await sandbox.stop();

    const result = await settlesWithin(sandbox.execute({ command: "sleep 100", timeoutMs: 10 }));

    expect(result.timedOut).toBe(true);
    expect(result.aborted).toBe(false);
    expect(result.exitCode).toBeNull();
    expect(session.resume).toHaveBeenCalledOnce();
    expect(session.run).not.toHaveBeenCalled();
  });

  it("settles as aborted when the signal fires while resuming", async () => {
    const session = makeSession({
      resume: vi.fn(() => new Promise<void>(() => {})),
    });
    const sandbox = new TenkiSandbox({ session: session as never });
    await sandbox.stop();
    const controller = new AbortController();

    const promise = sandbox.execute({ command: "sleep 100", signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const result = await settlesWithin(promise);

    expect(result.aborted).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBeNull();
    expect(session.resume).toHaveBeenCalledOnce();
    expect(session.run).not.toHaveBeenCalled();
  });
});

describe("TenkiSandbox lifecycle", () => {
  it("provisions via createAndWait with defaulted create options", async () => {
    const session = makeSession();
    mocks.createAndWait.mockResolvedValue(session);
    const sandbox = new TenkiSandbox({
      apiKey: "tk_test",
      name: "demo",
      cpuCores: 4,
      memoryMb: 8192,
      sshAuthorizedKeys: ["ssh-ed25519 AAAA"],
      image: "ubuntu",
      snapshotId: "snap-1",
      workspaceId: "ws-1",
      env: { FOO: "bar" },
    });

    await sandbox.start();

    expect(mocks.clientCtor).toHaveBeenCalledWith({ authToken: "tk_test" });
    expect(mocks.createAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        allowInbound: true,
        allowOutbound: true,
        name: "demo",
        cpuCores: 4,
        memoryMb: 8192,
        sshAuthorizedKeys: ["ssh-ed25519 AAAA"],
        image: "ubuntu",
        snapshotId: "snap-1",
        workspaceId: "ws-1",
        env: { FOO: "bar" },
      }),
    );
    expect(sandbox.status).toBe("ready");
  });

  it("adopts and resumes a paused session returned by provisioning", async () => {
    let resolveResume!: () => void;
    const session = makeSession({
      state: "PAUSED",
      resume: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveResume = resolve;
          }),
      ),
    });
    mocks.createAndWait.mockResolvedValue(session);
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const startPromise = sandbox.start();
    await vi.waitFor(() => expect(session.resume).toHaveBeenCalledOnce());
    expect(sandbox.status).toBe("idle");

    resolveResume();
    await startPromise;
    expect(sandbox.status).toBe("ready");
  });

  it("passes baseUrl and authToken alias through the client options", async () => {
    mocks.createAndWait.mockResolvedValue(makeSession());
    const sandbox = new TenkiSandbox({ authToken: "tk_alias", baseUrl: "https://example.test" });
    await sandbox.start();
    expect(mocks.clientCtor).toHaveBeenCalledWith({
      authToken: "tk_alias",
      baseUrl: "https://example.test",
    });
  });

  it("caches the session across calls and reuses the client", async () => {
    const session = makeSession();
    mocks.createAndWait.mockResolvedValue(session);
    const sandbox = new TenkiSandbox({});

    const first = await sandbox.getSandbox();
    const second = await sandbox.getSandbox();

    expect(first).toBe(second);
    expect(mocks.createAndWait).toHaveBeenCalledTimes(1);
  });

  it("rejects getSandbox with a clear error when the client hands back no session", async () => {
    mocks.createAndWait.mockResolvedValue(undefined);
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    await expect(sandbox.getSandbox()).rejects.toThrow("Tenki client returned no session");
  });

  it("clears the cached promise and flags error when provisioning fails", async () => {
    mocks.createAndWait.mockRejectedValueOnce(new Error("create failed"));
    const session = makeSession();
    mocks.createAndWait.mockResolvedValueOnce(session);
    const sandbox = new TenkiSandbox({});

    await expect(sandbox.start()).rejects.toThrow("create failed");
    expect(sandbox.status).toBe("error");

    // Next call retries provisioning instead of replaying the rejection.
    await expect(sandbox.getSandbox()).resolves.toBe(session);
    expect(mocks.createAndWait).toHaveBeenCalledTimes(2);
  });

  it("pauses the session on stop", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({ session: session as never });
    await sandbox.stop();
    expect(session.pause).toHaveBeenCalled();
  });

  it("is a no-op on stop when no session exists", async () => {
    const sandbox = new TenkiSandbox({});
    await expect(sandbox.stop()).resolves.toBeUndefined();
  });

  it("is a no-op on stop after the client hands back no session", async () => {
    mocks.createAndWait.mockResolvedValue(undefined);
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    // Caches sessionPromise as a promise resolving to undefined.
    await expect(sandbox.start()).resolves.toBeUndefined();
    await expect(sandbox.stop()).resolves.toBeUndefined();
  });

  it("surfaces a provisioning failure to a concurrent stop", async () => {
    mocks.createAndWait.mockRejectedValue(new Error("create failed"));
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const startAssertion = expect(sandbox.start()).rejects.toThrow("create failed");
    const stopAssertion = expect(sandbox.stop()).rejects.toThrow("create failed");

    await Promise.all([startAssertion, stopAssertion]);
    expect(sandbox.status).toBe("error");
  });

  it("closes the session on destroy and marks destroyed", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({ session: session as never });

    await sandbox.destroy();

    expect(session.close).toHaveBeenCalled();
    expect(sandbox.status).toBe("destroyed");
    expect(sandbox.getInfo()).toEqual({
      provider: "tenki",
      status: "destroyed",
      sessionId: undefined,
    });
  });

  it("swallows active session close failures and remains destroyed", async () => {
    const session = makeSession({
      close: vi.fn(async () => {
        throw new Error("close failed");
      }),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    await expect(sandbox.destroy()).resolves.toBeUndefined();

    expect(session.close).toHaveBeenCalledTimes(1);
    expect(sandbox.status).toBe("destroyed");
    await expect(sandbox.start()).rejects.toThrow("Sandbox has been destroyed");
  });

  it("retries a failed close on a later destroy without closing again after success", async () => {
    const close = vi
      .fn()
      .mockRejectedValueOnce(new Error("close failed"))
      .mockResolvedValueOnce(undefined);
    const session = makeSession({ close });
    const sandbox = new TenkiSandbox({ session: session as never });

    await expect(sandbox.destroy()).resolves.toBeUndefined();
    await expect(sandbox.destroy()).resolves.toBeUndefined();
    await expect(sandbox.destroy()).resolves.toBeUndefined();

    expect(close).toHaveBeenCalledTimes(2);
  });

  it("destroys cleanly after the client hands back no session", async () => {
    mocks.createAndWait.mockResolvedValue(undefined);
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    // Caches sessionPromise as a promise resolving to undefined.
    const result = await sandbox.execute({ command: "echo hi" });
    expect(result.aborted).toBe(true);

    await expect(sandbox.destroy()).resolves.toBeUndefined();
    // Repeated destroy must not be poisoned by a retained nullish entry.
    await expect(sandbox.destroy()).resolves.toBeUndefined();
    expect(sandbox.status).toBe("destroyed");
  });

  it("is a no-op on destroy when no session exists", async () => {
    const sandbox = new TenkiSandbox({});
    await sandbox.destroy();
    expect(sandbox.status).toBe("destroyed");
  });

  it("resumes a paused session on start", async () => {
    const session = makeSession();
    mocks.createAndWait.mockResolvedValue(session);
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    await sandbox.start();
    await sandbox.stop();
    expect(session.pause).toHaveBeenCalledTimes(1);
    expect(sandbox.status).toBe("idle");

    await sandbox.start();
    expect(session.resume).toHaveBeenCalledTimes(1);
    expect(sandbox.status).toBe("ready");
  });

  it("resumes a paused session on the next execute", async () => {
    const session = makeSession();
    mocks.createAndWait.mockResolvedValue(session);
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    await sandbox.start();
    await sandbox.stop();
    const result = await sandbox.execute({ command: "echo hi" });

    expect(session.resume).toHaveBeenCalledTimes(1);
    expect(sandbox.status).toBe("ready");
    expect(result.exitCode).toBe(0);
  });

  it.each(["start", "execute"] as const)(
    "recognizes and resumes an injected paused session on %s",
    async (operation) => {
      const session = makeSession({ state: "PAUSED" });
      const sandbox = new TenkiSandbox({ session: session as never });

      expect(sandbox.status).toBe("idle");
      if (operation === "start") {
        await sandbox.start();
      } else {
        await sandbox.execute({ command: "echo hi" });
      }

      expect(session.resume).toHaveBeenCalledOnce();
      expect(sandbox.status).toBe("ready");
    },
  );

  it("shares one resume transition across concurrent callers", async () => {
    let resolveResume!: () => void;
    const session = makeSession({
      state: "PAUSED",
      resume: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveResume = resolve;
          }),
      ),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const first = sandbox.start();
    const second = sandbox.start();
    await vi.waitFor(() => expect(session.resume).toHaveBeenCalledOnce());

    resolveResume();
    await Promise.all([first, second]);

    expect(session.resume).toHaveBeenCalledOnce();
    expect(sandbox.status).toBe("ready");
  });

  it("shares one pause transition across concurrent stop callers", async () => {
    let resolvePause!: () => void;
    const session = makeSession({
      pause: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePause = resolve;
          }),
      ),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const first = sandbox.stop();
    const second = sandbox.stop();
    await vi.waitFor(() => expect(session.pause).toHaveBeenCalledOnce());

    resolvePause();
    await Promise.all([first, second]);

    expect(session.pause).toHaveBeenCalledOnce();
    expect(sandbox.status).toBe("idle");
  });

  it("does not restore idle when a pause completes after destroy", async () => {
    let resolvePause!: () => void;
    const session = makeSession({
      pause: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePause = resolve;
          }),
      ),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const stopPromise = sandbox.stop();
    await vi.waitFor(() => expect(session.pause).toHaveBeenCalledOnce());
    await settlesWithin(sandbox.destroy());
    resolvePause();

    await expect(stopPromise).resolves.toBeUndefined();
    expect(sandbox.status).toBe("destroyed");
  });

  it("does not restore ready when a resume completes after destroy", async () => {
    let resolveResume!: () => void;
    const session = makeSession({
      state: "PAUSED",
      resume: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveResume = resolve;
          }),
      ),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const firstStart = sandbox.start();
    const secondStart = sandbox.start();
    await vi.waitFor(() => expect(session.resume).toHaveBeenCalledOnce());
    await settlesWithin(sandbox.destroy());
    expect(session.close).toHaveBeenCalledOnce();
    resolveResume();

    await expect(firstStart).rejects.toThrow("Sandbox has been destroyed");
    await expect(secondStart).rejects.toThrow("Sandbox has been destroyed");
    expect(sandbox.status).toBe("destroyed");
  });

  it("waits for pending provisioning and pauses the resulting session on stop", async () => {
    let resolveSession!: (value: unknown) => void;
    mocks.createAndWait.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const startPromise = sandbox.start();
    const stopPromise = sandbox.stop();
    const session = makeSession();
    resolveSession(session);

    await Promise.all([startPromise, stopPromise]);
    expect(session.pause).toHaveBeenCalledOnce();
    expect(sandbox.status).toBe("idle");
  });

  it("lets destroy supersede a stop waiting for provisioning", async () => {
    let resolveSession!: (value: unknown) => void;
    mocks.createAndWait.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const startPromise = sandbox.start();
    void startPromise.catch(() => undefined);
    const stopPromise = sandbox.stop();
    const destroyPromise = sandbox.destroy();
    const session = makeSession();
    resolveSession(session);

    await expect(destroyPromise).resolves.toBeUndefined();
    await expect(stopPromise).resolves.toBeUndefined();
    await expect(startPromise).rejects.toThrow("Sandbox has been destroyed");
    expect(session.pause).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
    expect(sandbox.status).toBe("destroyed");
  });

  it("waits for pending provisioning and the late session close before resolving", async () => {
    let resolveSession!: (value: unknown) => void;
    let resolveClose!: () => void;
    mocks.createAndWait.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const startPromise = sandbox.start();
    void startPromise.catch(() => undefined);
    const destroyPromise = sandbox.destroy();
    const concurrentDestroyPromise = sandbox.destroy();
    let destroySettled = false;
    void destroyPromise.then(
      () => {
        destroySettled = true;
      },
      () => {
        destroySettled = true;
      },
    );

    await Promise.resolve();
    expect(destroySettled).toBe(false);
    expect(sandbox.status).toBe("destroyed");

    const lateSession = makeSession({
      id: "late",
      close: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveClose = resolve;
          }),
      ),
    });
    resolveSession(lateSession);

    await vi.waitFor(() => expect(lateSession.close).toHaveBeenCalledTimes(1));
    expect(destroySettled).toBe(false);
    resolveClose();

    await expect(destroyPromise).resolves.toBeUndefined();
    await expect(concurrentDestroyPromise).resolves.toBeUndefined();
    await expect(startPromise).rejects.toThrow("Sandbox has been destroyed");
    expect(lateSession.close).toHaveBeenCalledTimes(1);
    expect(sandbox.status).toBe("destroyed");
    expect(sandbox.getInfo().sessionId).toBeUndefined();
  });

  it("swallows a late close failure and retries that session on the next destroy", async () => {
    let resolveSession!: (value: unknown) => void;
    let rejectClose!: (reason: unknown) => void;
    mocks.createAndWait.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const close = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            rejectClose = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);
    const lateSession = makeSession({ id: "late", close });
    const sandbox = new TenkiSandbox({ apiKey: "tk_test" });

    const startPromise = sandbox.start();
    void startPromise.catch(() => undefined);
    const destroyPromise = sandbox.destroy();
    resolveSession(lateSession);
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    rejectClose(new Error("late close failed"));

    await expect(destroyPromise).resolves.toBeUndefined();
    await expect(startPromise).rejects.toThrow("Sandbox has been destroyed");
    await expect(sandbox.destroy()).resolves.toBeUndefined();

    expect(close).toHaveBeenCalledTimes(2);
    expect(sandbox.status).toBe("destroyed");
  });

  it("reports info and instructions", () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({ session: session as never });
    expect(sandbox.getInfo()).toEqual({
      provider: "tenki",
      status: "ready",
      sessionId: "sess-123",
    });
    expect(sandbox.getInstructions()).toContain("Tenki Linux microVM");
    expect(sandbox.name).toBe("tenki");
  });

  it("describes base tools, the default working directory, and enabled egress by default", () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never });
    const instructions = sandbox.getInstructions();
    expect(instructions).toContain("Base tools: bash, git, node, npm, python3.");
    expect(instructions).toContain("Writable working directory is /home/tenki.");
    expect(instructions).toContain("Network egress is enabled.");
  });

  it("reports disabled egress when allowOutbound is false", () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never, allowOutbound: false });
    expect(sandbox.getInstructions()).toContain("Network egress is disabled.");
  });

  it("omits base tools and the default working directory for a custom image", () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never, image: "ubuntu" });
    const instructions = sandbox.getInstructions();
    expect(instructions).not.toContain("Base tools");
    expect(instructions).not.toContain("/home/tenki");
  });

  it("treats a snapshot as a custom image and omits base tools", () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never, snapshotId: "snap-1" });
    expect(sandbox.getInstructions()).not.toContain("Base tools");
  });

  it("reports a custom working directory when cwd is set", () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never, cwd: "/work" });
    expect(sandbox.getInstructions()).toContain("Working directory is /work.");
  });

  it("rejects execute after the sandbox is destroyed", async () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never });
    await sandbox.destroy();
    await expect(sandbox.execute({ command: "ls" })).rejects.toThrow("Sandbox has been destroyed");
  });

  it("rejects getSandbox and start after the sandbox is destroyed", async () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never });
    await sandbox.destroy();
    await expect(sandbox.getSandbox()).rejects.toThrow("Sandbox has been destroyed");
    await expect(sandbox.start()).rejects.toThrow("Sandbox has been destroyed");
  });
});

describe("createTenkiToolkit", () => {
  it("builds a toolkit that exposes preview URLs and authorizes SSH keys", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({ session: session as never });
    const toolkit = createTenkiToolkit(sandbox);

    expect(toolkit.name).toBe("tenki");
    expect(toolkit.addInstructions).toBe(true);
    const toolNames = toolkit.tools.map((t) => (t as { name: string }).name);
    expect(toolNames).toEqual(["expose_preview_url", "authorize_ssh_key"]);

    const preview = toolkit.tools[0] as { execute: (input: unknown) => Promise<unknown> };
    const previewResult = await preview.execute({ port: 3000, ttlMs: 60000 });
    expect(previewResult).toEqual({ previewUrl: "https://preview.tenki.cloud/abc" });
    expect(session.exposePort).toHaveBeenCalledWith(3000, { ttlMs: 60000 });

    const ssh = toolkit.tools[1] as { execute: (input: unknown) => Promise<{ message: string }> };
    const sshResult = await ssh.execute({ publicKey: "ssh-ed25519 AAAA user" });
    expect(session.updateSshAuthorizedKeys).toHaveBeenCalledWith(["ssh-ed25519 AAAA user"]);
    expect(sshResult.message).toContain("sess-123");
  });

  it("omits the ttl option when not provided", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({ session: session as never });
    const toolkit = createTenkiToolkit(sandbox);
    const preview = toolkit.tools[0] as { execute: (input: unknown) => Promise<unknown> };

    await preview.execute({ port: 8080 });

    expect(session.exposePort).toHaveBeenCalledWith(8080, undefined);
  });

  it("describes authorize_ssh_key as additive with the out-of-band caveat", () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never });
    const toolkit = createTenkiToolkit(sandbox);
    const ssh = toolkit.tools[1] as { description: string };
    expect(ssh.description).toContain("Additive");
    expect(ssh.description).toContain("out-of-band");
  });

  it("preserves configured keys when authorize_ssh_key runs through the tool", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({
      session: session as never,
      sshAuthorizedKeys: ["cfg-key"],
    });
    const toolkit = createTenkiToolkit(sandbox);
    const ssh = toolkit.tools[1] as { execute: (input: unknown) => Promise<unknown> };

    await ssh.execute({ publicKey: "ssh-ed25519 AAAA user" });

    expect(session.updateSshAuthorizedKeys).toHaveBeenCalledWith([
      "cfg-key",
      "ssh-ed25519 AAAA user",
    ]);
  });
});

describe("TenkiSandbox.authorizeSshKey", () => {
  it("merges constructor config keys with the new key and returns the session id", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({
      session: session as never,
      sshAuthorizedKeys: ["cfg-key"],
    });

    const result = await sandbox.authorizeSshKey("new-key");

    expect(session.updateSshAuthorizedKeys).toHaveBeenCalledWith(["cfg-key", "new-key"]);
    expect(result).toEqual({ sessionId: "sess-123" });
  });

  it("preserves keys supplied via the createOptions escape hatch", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({
      session: session as never,
      createOptions: { sshAuthorizedKeys: ["hatch-key"] },
    });

    await sandbox.authorizeSshKey("new-key");

    expect(session.updateSshAuthorizedKeys).toHaveBeenCalledWith(["hatch-key", "new-key"]);
  });

  it("accumulates keys across sequential adds", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({
      session: session as never,
      sshAuthorizedKeys: ["cfg"],
    });

    await sandbox.authorizeSshKey("k1");
    await sandbox.authorizeSshKey("k2");

    expect(session.updateSshAuthorizedKeys).toHaveBeenNthCalledWith(1, ["cfg", "k1"]);
    expect(session.updateSshAuthorizedKeys).toHaveBeenNthCalledWith(2, ["cfg", "k1", "k2"]);
  });

  it("dedupes repeated keys and keys equal to config keys", async () => {
    const session = makeSession();
    const sandbox = new TenkiSandbox({
      session: session as never,
      sshAuthorizedKeys: ["cfg"],
    });

    await sandbox.authorizeSshKey("k1");
    await sandbox.authorizeSshKey("k1");
    await sandbox.authorizeSshKey("cfg");

    expect(session.updateSshAuthorizedKeys).toHaveBeenNthCalledWith(2, ["cfg", "k1"]);
    expect(session.updateSshAuthorizedKeys).toHaveBeenNthCalledWith(3, ["cfg", "k1"]);
  });

  it("does not record a key whose RPC failed and keeps the queue usable", async () => {
    const session = makeSession();
    session.updateSshAuthorizedKeys.mockRejectedValueOnce(new Error("rpc down"));
    const sandbox = new TenkiSandbox({ session: session as never });

    await expect(sandbox.authorizeSshKey("k1")).rejects.toThrow("rpc down");
    await sandbox.authorizeSshKey("k2");

    expect(session.updateSshAuthorizedKeys).toHaveBeenNthCalledWith(2, ["k2"]);
  });

  it("serializes concurrent adds so neither key is lost", async () => {
    let releaseFirst: () => void = () => {};
    const session = makeSession({
      updateSshAuthorizedKeys: vi.fn().mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve;
          }),
      ),
    });
    const sandbox = new TenkiSandbox({ session: session as never });

    const first = sandbox.authorizeSshKey("k1");
    const second = sandbox.authorizeSshKey("k2");
    // The second update must not be issued while the first RPC is in flight.
    await vi.waitFor(() => expect(session.updateSshAuthorizedKeys).toHaveBeenCalledTimes(1));

    releaseFirst();
    await Promise.all([first, second]);

    expect(session.updateSshAuthorizedKeys).toHaveBeenNthCalledWith(1, ["k1"]);
    expect(session.updateSshAuthorizedKeys).toHaveBeenNthCalledWith(2, ["k1", "k2"]);
  });

  it("rejects after the sandbox is destroyed", async () => {
    const sandbox = new TenkiSandbox({ session: makeSession() as never });
    await sandbox.destroy();
    await expect(sandbox.authorizeSshKey("k1")).rejects.toThrow("Sandbox has been destroyed");
  });
});
