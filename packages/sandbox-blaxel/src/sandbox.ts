import { randomUUID } from "node:crypto";
import { SandboxInstance } from "@blaxel/core";
import {
  type WorkspaceSandbox,
  type WorkspaceSandboxExecuteOptions,
  type WorkspaceSandboxResult,
  normalizeCommandAndArgs,
} from "@voltagent/core";
import { attempt, attemptAsync, isEmptyObject, omit } from "es-toolkit";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  NO_TIMEOUT_MAX_WAIT_MS,
} from "./constants";
import { truncateOutput } from "./output";
import { applyEnvBindings, buildCommandLine, normalizeEnv } from "./shell";
import type { BlaxelSandboxConfig, BlaxelSandboxInstance, BlaxelSandboxOptions } from "./types";

// VoltAgent extras on BlaxelSandboxConfig — stripped before SDK calls.
const VOLTAGENT_CONFIG_KEYS = [
  "cwd",
  "defaultTimeoutMs",
  "maxOutputBytes",
  "pollIntervalMs",
] as const satisfies ReadonlyArray<keyof BlaxelSandboxConfig>;

function resolveCallOption(callValue: number | undefined, fallback: number): number {
  return callValue === undefined ? fallback : Math.max(0, callValue);
}

/**
 * VoltAgent workspace sandbox provider backed by `@blaxel/core`.
 */
export class BlaxelSandbox implements WorkspaceSandbox {
  /**
   * Provider identifier from the `WorkspaceSandbox` contract. Always `"blaxel"`.
   */
  name = "blaxel";

  private readonly apiKey?: string;
  private readonly workspace?: string;
  private readonly config?: BlaxelSandboxConfig;
  private sandbox?: Promise<BlaxelSandboxInstance>;

  /**
   * The underlying sandbox is lazily created on first `execute()` /
   * `getSandbox()`. Sets `BL_API_KEY` / `BL_WORKSPACE` env vars when provided.
   */
  constructor(options: BlaxelSandboxOptions = {}) {
    this.apiKey = options.apiKey;
    this.workspace = options.workspace;
    this.config = options.config;
    this.sandbox = options.sandbox ? Promise.resolve(options.sandbox) : undefined;

    applyEnvBindings({
      BL_API_KEY: this.apiKey,
      BL_WORKSPACE: this.workspace,
    });
  }

  /**
   * Execute a single shell command in the underlying Blaxel sandbox.
   *
   * @throws When `options.stdin` is provided (unsupported).
   * @throws When `options.command` is missing or whitespace-only.
   */
  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    if (options.stdin !== undefined) {
      throw new Error("Workspace sandbox does not support stdin for this command.");
    }

    const startTime = Date.now();
    const normalized = normalizeCommandAndArgs(options.command ?? "", options.args);
    const command = normalized.command.trim();

    if (command.length === 0) {
      throw new Error("Sandbox command is required");
    }

    if (options.signal?.aborted) {
      return {
        stdout: "",
        stderr: "",
        exitCode: null,
        durationMs: 0,
        timedOut: false,
        aborted: true,
        stdoutTruncated: false,
        stderrTruncated: false,
      };
    }

    const sandbox = await this.resolveSandbox();
    const timeoutMs = resolveCallOption(
      options.timeoutMs,
      this.config?.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    const maxOutputBytes = resolveCallOption(
      options.maxOutputBytes,
      this.config?.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
    );
    const pollIntervalMs = this.config?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const callEnv = normalizeEnv(options.env);
    const commandLine = buildCommandLine(command, normalized.args);
    const processName = `voltagent-${randomUUID()}`;

    let aborted = false;
    let timedOut = false;
    let abortListener: (() => void) | undefined;

    const killSilently = async (): Promise<void> => {
      await attemptAsync(() => sandbox.process.kill(processName));
    };

    if (options.signal) {
      abortListener = () => {
        aborted = true;
        // Listener must be sync; killSilently swallows its own errors.
        void killSilently();
      };
      options.signal.addEventListener("abort", abortListener, { once: true });
    }

    let started: Awaited<ReturnType<typeof sandbox.process.exec>> | undefined;
    try {
      started = await sandbox.process.exec({
        name: processName,
        command: commandLine,
        timeout: 0,
        workingDir: options.cwd ?? this.config?.cwd,
        env: isEmptyObject(callEnv) ? undefined : callEnv,
        onStdout: options.onStdout,
        onStderr: options.onStderr,
      });

      // wait() throws "Process did not finish in time" on timeout.
      const [waitError] = await attemptAsync(() =>
        sandbox.process.wait(processName, {
          maxWait: timeoutMs > 0 ? timeoutMs : NO_TIMEOUT_MAX_WAIT_MS,
          interval: pollIntervalMs,
        }),
      );
      if (waitError) {
        timedOut = true;
        await killSilently();
      }
    } finally {
      if (options.signal && abortListener) {
        options.signal.removeEventListener("abort", abortListener);
      }
      const close = started && "close" in started ? started.close : undefined;
      if (close) attempt(close);
    }

    if (maxOutputBytes <= 0) {
      const [, finalState] = await attemptAsync(() => sandbox.process.get(processName));
      return {
        stdout: "",
        stderr: "",
        exitCode: finalState?.exitCode ?? null,
        durationMs: Date.now() - startTime,
        timedOut,
        aborted,
        stdoutTruncated: true,
        stderrTruncated: true,
      };
    }

    const [[, finalState], [, stdoutRaw], [, stderrRaw]] = await Promise.all([
      attemptAsync(() => sandbox.process.get(processName)),
      attemptAsync(() => sandbox.process.logs(processName, "stdout")),
      attemptAsync(() => sandbox.process.logs(processName, "stderr")),
    ]);
    const exitCode = finalState?.exitCode ?? null;
    const stdoutInfo = truncateOutput(stdoutRaw ?? "", maxOutputBytes);
    const stderrInfo = truncateOutput(stderrRaw ?? "", maxOutputBytes);

    return {
      stdout: stdoutInfo.content,
      stderr: stderrInfo.content,
      exitCode,
      durationMs: Date.now() - startTime,
      timedOut,
      aborted,
      stdoutTruncated: stdoutInfo.truncated,
      stderrTruncated: stderrInfo.truncated,
    };
  }

  /**
   * Return the underlying Blaxel SDK sandbox instance, lazily creating it on
   * first call. Memoized until {@link destroy} is called.
   */
  async getSandbox(): Promise<BlaxelSandboxInstance> {
    return await this.resolveSandbox();
  }

  /**
   * Destroy the underlying Blaxel sandbox and clear the cached instance.
   * Best-effort: errors from `sandbox.delete()` are swallowed.
   */
  async destroy(): Promise<void> {
    const pending = this.sandbox;
    this.sandbox = undefined;
    if (!pending) {
      return;
    }
    const [resolveError, current] = await attemptAsync<BlaxelSandboxInstance, Error>(() => pending);
    if (resolveError) {
      return;
    }
    await attemptAsync(() => current.delete());
  }

  /**
   * Return `{ provider: "blaxel", ...sdkConfig }` for diagnostics/UIs.
   * Excludes voltagent-specific extras (cwd, defaults, etc.).
   */
  getInfo(): Record<string, unknown> {
    return { provider: "blaxel", ...this.sdkConfig };
  }

  /**
   * `this.config` with voltagent-specific extras stripped — what gets
   * forwarded to `SandboxInstance.createIfNotExists()`.
   */
  private get sdkConfig() {
    return omit(this.config ?? {}, VOLTAGENT_CONFIG_KEYS);
  }

  private resolveSandbox(): Promise<BlaxelSandboxInstance> {
    if (!this.sandbox) {
      this.sandbox = this.createSandbox();
    }
    return this.sandbox;
  }

  private async createSandbox(): Promise<BlaxelSandboxInstance> {
    const [error, sandbox] = await attemptAsync<BlaxelSandboxInstance, Error>(() =>
      SandboxInstance.createIfNotExists(this.sdkConfig),
    );
    if (error) {
      this.sandbox = undefined;
      throw error;
    }
    return sandbox;
  }
}
