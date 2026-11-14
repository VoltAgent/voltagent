import {
  type WorkspaceSandbox,
  type WorkspaceSandboxExecuteOptions,
  type WorkspaceSandboxResult,
  normalizeCommandAndArgs,
} from "@voltagent/core";
import { Machine, type MachineConfig } from "smolmachines";

export type SmolMachinesSandboxInstance = Machine;

export type SmolMachinesSandboxOptions = {
  config?: MachineConfig;
  env?: Record<string, string>;
  cwd?: string;
  defaultTimeoutMs?: number;
  maxOutputBytes?: number;
  machine?: SmolMachinesSandboxInstance;
};

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
// The engine ends a command whose stdout and stderr together pass 11 MiB with this error.
const OUTPUT_CAP_ERROR = /^streaming output exceeded \d+ byte cap/;

type OutputBuffer = {
  chunks: Buffer[];
  size: number;
  truncated: boolean;
};

const appendOutput = (buffer: OutputBuffer, chunk: string, maxBytes: number): void => {
  if (buffer.truncated) {
    return;
  }
  const data = Buffer.from(chunk, "utf-8");
  let end = Math.min(data.length, Math.max(0, maxBytes - buffer.size));
  // Back the cut off UTF-8 continuation bytes so no character is split.
  while (end > 0 && end < data.length && (data[end] & 0xc0) === 0x80) {
    end -= 1;
  }
  buffer.chunks.push(data.subarray(0, end));
  buffer.size += end;
  buffer.truncated = end < data.length;
};

const emit = (callback: ((chunk: string) => void) | undefined, chunk: string): void => {
  try {
    callback?.(chunk);
  } catch {
    // ignore streaming callback errors
  }
};

export class SmolMachinesSandbox implements WorkspaceSandbox {
  name = "smolmachines";
  private readonly config: MachineConfig;
  private readonly env: Record<string, string>;
  private readonly cwd?: string;
  private readonly defaultTimeoutMs: number;
  private readonly maxOutputBytes: number;
  private machine?: Promise<SmolMachinesSandboxInstance>;

  constructor(options: SmolMachinesSandboxOptions = {}) {
    this.config = options.config ?? {};
    this.env = options.env ?? {};
    this.cwd = options.cwd;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.machine = options.machine ? Promise.resolve(options.machine) : undefined;
  }

  private resolveMachine(): Promise<SmolMachinesSandboxInstance> {
    if (!this.machine) {
      // Pinned to the local engine: without a target the SDK picks the cloud when SMOL_CLOUD_TOKEN is set.
      const pending = Machine.create(this.config, { target: "local" });
      this.machine = pending;
      pending.catch(() => {
        if (this.machine === pending) {
          this.machine = undefined;
        }
      });
    }
    return this.machine;
  }

  /**
   * Returns the underlying smol machine, creating it on first use.
   * Use this for smolmachines APIs beyond `execute`, such as `readFile` and `writeFile`.
   */
  async getSandbox(): Promise<SmolMachinesSandboxInstance> {
    return this.resolveMachine();
  }

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    const startTime = Date.now();
    const normalized = normalizeCommandAndArgs(options.command ?? "", options.args);
    if (!normalized.command) {
      throw new Error("Sandbox command is required");
    }
    // The engine's streaming exec, the one that can kill a running command, drops stdin.
    if (options.stdin !== undefined) {
      throw new Error("SmolMachinesSandbox does not support stdin yet");
    }

    let aborted = options.signal?.aborted ?? false;
    let timedOut = false;
    const stdout: OutputBuffer = { chunks: [], size: 0, truncated: false };
    const stderr: OutputBuffer = { chunks: [], size: 0, truncated: false };
    let exitCode: number | null = null;

    if (!aborted) {
      const maxOutputBytes = Math.max(0, options.maxOutputBytes ?? this.maxOutputBytes);
      const timeoutMs = Math.max(0, options.timeoutMs ?? this.defaultTimeoutMs);
      // Aborting ends a wait for the machine to boot, and kills a running command inside it.
      const controller = new AbortController();
      const stopped = new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(controller.signal.reason));
      });
      const onAbort = () => {
        aborted = true;
        controller.abort();
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });
      if (options.signal?.aborted) {
        onAbort();
      }
      const timeoutId =
        timeoutMs > 0
          ? setTimeout(() => {
              timedOut = true;
              controller.abort();
            }, timeoutMs)
          : undefined;

      try {
        const machine = await Promise.race([this.resolveMachine(), stopped]);
        controller.signal.throwIfAborted();
        const events = machine.execStream([normalized.command, ...(normalized.args ?? [])], {
          env: { ...this.env, ...options.env },
          workdir: options.cwd ?? this.cwd,
          signal: controller.signal,
        });
        for await (const event of events) {
          if (event.kind === "stdout") {
            appendOutput(stdout, event.data, maxOutputBytes);
            emit(options.onStdout, event.data);
          } else if (event.kind === "stderr") {
            appendOutput(stderr, event.data, maxOutputBytes);
            emit(options.onStderr, event.data);
          } else if (event.kind === "exit") {
            exitCode = event.exitCode;
          } else if (OUTPUT_CAP_ERROR.test(event.message)) {
            stdout.truncated = true;
            stderr.truncated = true;
            break;
          } else {
            throw new Error(event.message);
          }
        }
      } catch (error) {
        if (!aborted && !timedOut) {
          throw error;
        }
      } finally {
        clearTimeout(timeoutId);
        options.signal?.removeEventListener("abort", onAbort);
      }
    }

    return {
      stdout: Buffer.concat(stdout.chunks).toString("utf-8"),
      stderr: Buffer.concat(stderr.chunks).toString("utf-8"),
      exitCode,
      durationMs: Date.now() - startTime,
      timedOut,
      aborted,
      stdoutTruncated: stdout.truncated,
      stderrTruncated: stderr.truncated,
    };
  }

  /**
   * Deletes the machine at once, without waiting for running commands.
   * A command still running in it rejects with a `connection closed` error.
   * The next `execute` creates a new machine.
   */
  async destroy(): Promise<void> {
    const pending = this.machine;
    this.machine = undefined;
    const machine = await pending?.catch(() => undefined);
    await machine?.delete();
  }
}
