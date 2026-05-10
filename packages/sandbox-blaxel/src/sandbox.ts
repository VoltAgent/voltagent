import { randomUUID } from "node:crypto";
import { SandboxInstance } from "@blaxel/core";
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";
import { attempt, attemptAsync, isNil, isNotNil, omit } from "es-toolkit";
import { NO_TIMEOUT_MAX_WAIT_MS } from "./constants";
import { type ParsedExecuteOptions, applyEnvBindings, parseOptions } from "./shell";
import type { BlaxelSandboxConfig, BlaxelSandboxInstance, BlaxelSandboxOptions } from "./types";
import { toError, truncateOutput, withEventListener } from "./utils";

/**
 * VoltAgent workspace sandbox provider backed by `@blaxel/core`.
 */
export class BlaxelSandbox implements WorkspaceSandbox {
  /**
   * Provider identifier from the `WorkspaceSandbox` contract. Always `"blaxel"`.
   */
  name = "blaxel";

  /**
   * Constructor-supplied Blaxel API key. Mirrored to `process.env.BL_API_KEY`
   * by the constructor so the SDK picks it up.
   */
  private readonly apiKey?: string;

  /**
   * Constructor-supplied Blaxel workspace ID. Mirrored to
   * `process.env.BL_WORKSPACE` by the constructor so the SDK picks it up.
   */
  private readonly workspace?: string;

  /**
   * Constructor-supplied sandbox provisioning config + voltagent-specific
   * `execute()` defaults (`cwd`, `defaultTimeoutMs`, `maxOutputBytes`,
   * `pollIntervalMs`). The voltagent extras are stripped via
   * {@link getSdkConfig} before forwarding to the SDK.
   */
  private readonly config?: BlaxelSandboxConfig;

  /**
   * In-flight or resolved promise for the underlying SDK sandbox. Memoizes
   * provisioning across concurrent `execute()` / `getSandbox()` calls. Cleared
   * by {@link destroy} or {@link createSandbox} on failure so the next call
   * retries provisioning instead of replaying a rejected promise.
   */
  private sandbox?: Promise<BlaxelSandboxInstance>;

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  /**
   * The underlying sandbox is lazily created on first `execute()` /
   * `getSandbox()`. Writes `BL_API_KEY` / `BL_WORKSPACE` to `process.env` when
   * provided — this is the only auth path the Blaxel SDK supports, so
   * constructing multiple `BlaxelSandbox` instances with different credentials
   * in the same process will last-write-win.
   *
   * See: https://docs.blaxel.ai/Sandboxes/Overview#learn-more-about-authentication-on-blaxel
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
    const startTime = Date.now();
    const [parseError, parsed] = parseOptions(options, this.config);
    if (parseError) {
      throw parseError;
    }

    if (options.signal?.aborted) {
      return abortedResult(0);
    }

    const processName = `voltagent-${randomUUID()}`;
    // Captured once after resolveSandbox() and threaded through every
    // sub-operation in this execute() so a concurrent destroy() can't
    // resurrect a fresh sandbox via re-entrant resolveSandbox() calls.
    let resolvedSandbox: BlaxelSandboxInstance | undefined;

    return await withAbort({
      signal: options.signal,
      onAbort: () => {
        // Skip if the sandbox hasn't resolved yet — there is no remote
        // process to kill, and re-resolving here would defeat the threading.
        if (resolvedSandbox) {
          void this.killProcess({ sandbox: resolvedSandbox, processName });
        }
      },
      run: async () => {
        // Provisioning can take seconds. Check the signal after it completes
        // so we don't start a process for a call that was cancelled mid-flight
        // (covers both the listener-attach race and abort-during-provisioning).
        const sandbox = await this.resolveSandbox();
        resolvedSandbox = sandbox;
        if (options.signal?.aborted) {
          return abortedResult(Date.now() - startTime);
        }

        const { timedOut } = await this.runProcess({
          sandbox,
          parsed,
          processName,
          signal: options.signal,
          options,
        });
        const output = await this.fetchProcessOutput({
          sandbox,
          processName,
          maxOutputBytes: parsed.maxOutputBytes,
        });
        return {
          ...output,
          durationMs: Date.now() - startTime,
          timedOut,
          aborted: options.signal?.aborted ?? false,
        };
      },
    });
  }

  /**
   * Destroy the underlying Blaxel sandbox and clear the cached instance.
   * Best-effort: errors from `sandbox.delete()` are swallowed.
   */
  async destroy(): Promise<void> {
    const pending = this.sandbox;
    this.sandbox = undefined;

    if (isNil(pending)) {
      return;
    }

    const [resolveError, current] = await attemptAsync<BlaxelSandboxInstance, Error>(() => {
      return pending;
    });

    if (resolveError) {
      return;
    }

    await attemptAsync(() => {
      return current.delete();
    });
  }

  /**
   * Return `{ provider: "blaxel", ...sdkConfig }` for diagnostics/UIs.
   * Excludes voltagent-specific extras (cwd, defaults, etc.).
   */
  getInfo(): Record<string, unknown> {
    return { provider: "blaxel", ...this.getSdkConfig() };
  }

  /**
   * Return the underlying Blaxel SDK sandbox instance, lazily creating it on
   * first call. Memoized until {@link destroy} is called.
   */
  async getSandbox(): Promise<BlaxelSandboxInstance> {
    return await this.resolveSandbox();
  }

  /**
   * Best-effort kill of a process inside the sandbox by name. Errors are
   * swallowed via `attemptAsync` — kill is wired to abort listeners and timeout
   * paths where we can't surface a failure to the caller.
   *
   * Takes the sandbox as a param (rather than calling `resolveSandbox()`)
   * so concurrent `destroy()` can't cause this kill to land on a freshly
   * provisioned sandbox instead of the one that owns `processName`.
   */
  private async killProcess({
    sandbox,
    processName,
  }: {
    sandbox: BlaxelSandboxInstance;
    processName: string;
  }): Promise<{ status: "success" | "failure"; error?: Error }> {
    const [err] = await attemptAsync(() => {
      return sandbox.process.kill(processName);
    });

    if (err) {
      return { status: "failure", error: toError(err) };
    }
    return { status: "success" };
  }

  /**
   * Run a single process to completion: `process.exec` → `process.wait`, with
   * kill-on-timeout and a `started.close` cleanup in `finally`.
   *
   * Caller owns abort wiring (see {@link withAbort}). On `wait()` rejection we
   * treat it as a timeout, fire {@link killProcess}, and surface `{ timedOut: true }`.
   *
   * Re-checks `signal.aborted` immediately after `exec()` returns to close the
   * window where the abort listener fires while exec is in-flight (its kill
   * lands before the remote process exists) and `exec()` then leaves the
   * just-launched process running unchecked.
   *
   * @returns `{ timedOut }` — `true` iff `wait()` rejected.
   */
  private async runProcess({
    sandbox,
    parsed,
    processName,
    signal,
    options,
  }: {
    sandbox: BlaxelSandboxInstance;
    parsed: ParsedExecuteOptions;
    processName: string;
    signal: AbortSignal | undefined;
    options: Pick<WorkspaceSandboxExecuteOptions, "onStdout" | "onStderr">;
  }): Promise<{ timedOut: boolean }> {
    const { command, env, cwd, timeoutMs, pollIntervalMs } = parsed;
    const started = await sandbox.process.exec({
      name: processName,
      command,
      timeout: 0,
      workingDir: cwd,
      env,
      onStdout: options.onStdout,
      onStderr: options.onStderr,
    });
    try {
      // Late abort: a signal that fired during exec() may have caused the
      // listener's kill to land before the remote process existed. Now that
      // exec() has returned, fire kill ourselves and skip the wait().
      if (signal?.aborted) {
        await this.killProcess({ sandbox, processName });
        return { timedOut: false };
      }
      // wait() throws "Process did not finish in time" on timeout. Other
      // rejections (network failures, SDK teardown, etc.) are real errors and
      // must surface to the caller — only the timeout-message match is
      // treated as `timedOut: true`.
      const [waitError] = await attemptAsync(() => {
        return sandbox.process.wait(processName, {
          maxWait: timeoutMs > 0 ? timeoutMs : NO_TIMEOUT_MAX_WAIT_MS,
          interval: pollIntervalMs,
        });
      });
      if (isNotNil(waitError)) {
        if (!isWaitTimeoutError(waitError)) {
          throw waitError;
        }
        // Best-effort cleanup. We intentionally swallow kill failures here to
        // match the e2b provider's posture (e2b: `requestKill().catch(() => undefined)`).
        // Callers see `timedOut: true` and can `destroy()` the sandbox if they
        // suspect the remote process is still running.
        await this.killProcess({ sandbox, processName });
        return { timedOut: true };
      }
      return { timedOut: false };
    } finally {
      if ("close" in started) {
        attempt(() => started.close());
      }
    }
  }

  /**
   * Gather final state and stdout/stderr from a process that's already exited.
   *
   * - When `maxOutputBytes <= 0`, skips the log fetches entirely and flags both
   *   streams as truncated. Use this to opt out of the wire cost of streaming
   *   output back when the caller doesn't care.
   * - Otherwise fetches state + both log streams in parallel and runs each
   *   stream through {@link truncateOutput} for client-side capping.
   *
   * Each SDK call is wrapped in `attemptAsync` so a single failure (e.g. the
   * process record was reaped) degrades gracefully to empty output / `null`
   * exit code rather than throwing.
   */
  private async fetchProcessOutput({
    sandbox,
    processName,
    maxOutputBytes,
  }: {
    sandbox: BlaxelSandboxInstance;
    processName: string;
    maxOutputBytes: number;
  }): Promise<
    Pick<
      WorkspaceSandboxResult,
      "stdout" | "stderr" | "exitCode" | "stdoutTruncated" | "stderrTruncated"
    >
  > {
    if (maxOutputBytes <= 0) {
      const [, finalState] = await attemptAsync(() => {
        return sandbox.process.get(processName);
      });
      return {
        stdout: "",
        stderr: "",
        exitCode: finalState?.exitCode ?? null,
        stdoutTruncated: true,
        stderrTruncated: true,
      };
    }

    const [[, finalState], [, stdoutRaw], [, stderrRaw]] = await Promise.all([
      attemptAsync(() => {
        return sandbox.process.get(processName);
      }),
      attemptAsync(() => {
        return sandbox.process.logs(processName, "stdout");
      }),
      attemptAsync(() => {
        return sandbox.process.logs(processName, "stderr");
      }),
    ]);
    const stdoutInfo = truncateOutput(stdoutRaw ?? "", maxOutputBytes);
    const stderrInfo = truncateOutput(stderrRaw ?? "", maxOutputBytes);
    return {
      stdout: stdoutInfo.content,
      stderr: stderrInfo.content,
      exitCode: finalState?.exitCode ?? null,
      stdoutTruncated: stdoutInfo.truncated,
      stderrTruncated: stderrInfo.truncated,
    };
  }

  /**
   * Return the cached sandbox promise, kicking off provisioning on first call.
   * Memoizes the in-flight promise so concurrent `execute()` calls share a
   * single SDK provisioning request.
   */
  private resolveSandbox(): Promise<BlaxelSandboxInstance> {
    if (!this.sandbox) {
      this.sandbox = this.createSandbox();
    }
    return this.sandbox;
  }

  /**
   * Provision the underlying Blaxel SDK sandbox via `createIfNotExists`. On
   * failure, clears the cached promise so the next `execute()` retries
   * provisioning instead of replaying the failed promise.
   */
  private async createSandbox(): Promise<BlaxelSandboxInstance> {
    const [error, sandbox] = await attemptAsync<BlaxelSandboxInstance, Error>(() => {
      return SandboxInstance.createIfNotExists(this.getSdkConfig());
    });

    if (error) {
      this.sandbox = undefined;
      throw error;
    }

    return sandbox;
  }

  /**
   * `this.config` with voltagent-specific extras stripped — what gets
   * forwarded to `SandboxInstance.createIfNotExists()`.
   */
  private getSdkConfig() {
    return omit(this.config ?? {}, ["cwd", "defaultTimeoutMs", "maxOutputBytes", "pollIntervalMs"]);
  }
}

/**
 * Bracket-style abort scope: attaches `onAbort` to `signal`, runs `run`,
 * always detaches the listener — even if `run` throws. Returns whatever `run`
 * resolves to.
 *
 * When `signal` is `undefined`, the listener wiring is skipped and `run` is
 * invoked directly.
 *
 * @private
 */
async function withAbort<T>({
  signal,
  onAbort,
  run,
}: {
  signal: AbortSignal | undefined;
  onAbort: () => void;
  run: () => Promise<T>;
}): Promise<T> {
  if (!signal) {
    return await run();
  }
  return withEventListener({
    target: signal,
    event: "abort",
    listener: onAbort,
    options: { once: true },
    run,
  });
}

/**
 * Is this error the SDK's "wait exceeded `maxWait`" timeout signal? The SDK
 * surfaces it as a plain `Error` with the message "Process did not finish in
 * time" — anything else is a real failure (network, teardown, malformed
 * response) and must propagate.
 *
 * @private
 */
function isWaitTimeoutError(error: unknown): boolean {
  return error instanceof Error && /did not finish in time/i.test(error.message);
}

/**
 * Empty `aborted: true` result returned when the call's `AbortSignal` fires
 * before the sandbox process is started.
 *
 * @private
 */
function abortedResult(durationMs: number): WorkspaceSandboxResult {
  return {
    stdout: "",
    stderr: "",
    exitCode: null,
    durationMs,
    timedOut: false,
    aborted: true,
    stdoutTruncated: false,
    stderrTruncated: false,
  };
}
