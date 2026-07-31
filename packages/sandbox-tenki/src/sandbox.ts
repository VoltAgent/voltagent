import {
  type ClientOptions,
  type CreateOptions,
  type ProcessRunHandle,
  type Session,
  TenkiSandbox as TenkiClient,
} from "@tenkicloud/sandbox";
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
  WorkspaceSandboxStatus,
} from "@voltagent/core";
import { normalizeCommandAndArgs } from "@voltagent/core";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
  type OutputBuffer,
  abortedResult,
  appendOutput,
  appendRunDiagnostic,
  decodeBytes,
  extractSignal,
  formatRunDiagnostic,
  initOutputBuffer,
  isCommandTimeoutError,
  normalizeEnv,
  resolveOutput,
  resolveWithin,
  stringToReadableStream,
  timedOutResult,
} from "./utils";

/**
 * Upper bound on how long a queued lifecycle transition waits for
 * `session.resume()`. The resume RPC has no transport deadline, so without a
 * bound one dead connection would hold {@link TenkiSandbox.lifecycleTransition}
 * — and every later `stop()`/`start()`/`execute()` on a paused sandbox —
 * hostage forever. Matches the SDK's own `waitResumed` default. On expiry the
 * sandbox stays `paused`, and retrying is safe: the engine treats a resume on
 * an already-RUNNING session as idempotent.
 */
const RESUME_TRANSITION_TIMEOUT_MS = 180_000;

/**
 * The underlying Tenki SDK session type, re-exported for consumers that reach
 * past the `WorkspaceSandbox` seam via {@link TenkiSandbox.getSandbox}.
 */
export type TenkiSandboxInstance = Session;

/**
 * Public constructor options for {@link TenkiSandbox}.
 *
 * The adapter only relies on Tenki's create/exec/close + preview + SSH surface;
 * it never touches volumes, templates, or snapshots. `image`/`snapshotId` are
 * forwarded to `createAndWait` as-is when provided but are not required.
 */
export type TenkiSandboxOptions = {
  /**
   * Tenki API key (keys are prefixed `tk_`). Forwarded to the SDK client as
   * `authToken`. When omitted, the SDK falls back to `TENKI_AUTH_TOKEN` /
   * `TENKI_API_KEY` from the environment.
   */
  apiKey?: string;
  /**
   * Alias for {@link TenkiSandboxOptions.apiKey}. `apiKey` takes precedence when
   * both are set.
   */
  authToken?: string;
  /**
   * Override the Tenki API base URL.
   */
  baseUrl?: string;
  /**
   * Human-readable session name.
   */
  name?: string;
  /**
   * vCPUs to allocate to the microVM.
   */
  cpuCores?: number;
  /**
   * Memory (MiB) to allocate to the microVM.
   */
  memoryMb?: number;
  /**
   * Default environment variables merged into every `execute()` call.
   */
  env?: Record<string, string>;
  /**
   * Default working directory for `execute()`; per-call `cwd` overrides it.
   */
  cwd?: string;
  /**
   * Allow inbound connections. Required for preview URLs. Default `true`.
   */
  allowInbound?: boolean;
  /**
   * Allow outbound network egress. Default `true`.
   */
  allowOutbound?: boolean;
  /**
   * SSH public keys authorized on session creation.
   */
  sshAuthorizedKeys?: string[];
  /**
   * Container image to boot the microVM from (optional).
   */
  image?: string;
  /**
   * Snapshot to restore the microVM from (optional).
   */
  snapshotId?: string;
  /**
   * Explicit Tenki workspace scope for trusted service credentials. Ordinary
   * workspace API keys infer their workspace server-side and should omit this.
   */
  workspaceId?: string;
  /**
   * Default command timeout (ms). Per-call `timeoutMs` overrides it.
   * Default `60000`. Set to `0` to disable.
   */
  defaultTimeoutMs?: number;
  /**
   * Max stdout/stderr bytes kept per stream before truncation.
   * Default `5 * 1024 * 1024` (5 MiB).
   */
  maxOutputBytes?: number;
  /**
   * Extra options forwarded verbatim to `createAndWait` (escape hatch for
   * fields the adapter does not surface, e.g. `idleTimeoutMinutes`, `tags`).
   */
  createOptions?: CreateOptions;
  /**
   * Pre-resolved Tenki session to reuse instead of creating a new one.
   */
  session?: Session;
};

/**
 * VoltAgent workspace sandbox provider backed by `@tenkicloud/sandbox`.
 *
 * Provisions a single disposable Tenki Linux microVM per instance and reuses it
 * across every `execute_command` via the session `run` API (which gives native
 * `cwd`/`env`/`stdin`, per-command kill for timeout/abort, and separate
 * stdout/stderr streams).
 */
export class TenkiSandbox implements WorkspaceSandbox {
  /** Provider identifier from the `WorkspaceSandbox` contract. Always `"tenki"`. */
  name = "tenki";

  /** Lifecycle status surfaced to the workspace. */
  status: WorkspaceSandboxStatus = "idle";

  private readonly clientOptions: ClientOptions;
  private readonly createOptions: CreateOptions;
  private readonly env: Record<string, string>;
  private readonly cwd?: string;
  private readonly defaultTimeoutMs: number;
  private readonly maxOutputBytes: number;

  private client?: TenkiClient;
  private session?: Session;
  private sessionPromise?: Promise<Session>;
  private readonly sessionsPendingClose = new Set<Session>();
  private destroyPromise?: Promise<void>;
  private paused = false;
  private generation = 0;

  /**
   * Serializes pause/resume RPCs so concurrent lifecycle callers observe one
   * transition at a time. The chain itself always resolves; the promise
   * returned to a caller still carries that caller's transition failure.
   */
  private lifecycleTransition: Promise<void> = Promise.resolve();

  /**
   * SSH keys successfully applied via {@link authorizeSshKey}. Tenki's
   * `updateSshAuthorizedKeys` replaces the whole set and the SDK has no API to
   * read the current keys back, so the adapter tracks what it has applied.
   */
  private readonly addedSshKeys = new Set<string>();

  /**
   * Serializes {@link authorizeSshKey} updates: two concurrent calls would
   * otherwise merge from the same stale snapshot and the later replace-RPC
   * would drop the earlier key. Always resolved; failures surface on the
   * caller's promise, not the chain.
   */
  private sshUpdateChain: Promise<void> = Promise.resolve();

  constructor(options: TenkiSandboxOptions = {}) {
    const authToken = options.apiKey ?? options.authToken;
    this.clientOptions = {};
    if (authToken !== undefined) {
      this.clientOptions.authToken = authToken;
    }
    if (options.baseUrl !== undefined) {
      this.clientOptions.baseUrl = options.baseUrl;
    }

    this.env = normalizeEnv(options.env);
    this.cwd = options.cwd;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

    this.createOptions = {
      allowInbound: options.allowInbound ?? true,
      allowOutbound: options.allowOutbound ?? true,
      ...(options.createOptions ?? {}),
    };
    if (options.name !== undefined) {
      this.createOptions.name = options.name;
    }
    if (options.cpuCores !== undefined) {
      this.createOptions.cpuCores = options.cpuCores;
    }
    if (options.memoryMb !== undefined) {
      this.createOptions.memoryMb = options.memoryMb;
    }
    if (options.sshAuthorizedKeys !== undefined) {
      this.createOptions.sshAuthorizedKeys = options.sshAuthorizedKeys;
    }
    if (options.image !== undefined) {
      this.createOptions.image = options.image;
    }
    if (options.snapshotId !== undefined) {
      this.createOptions.snapshotId = options.snapshotId;
    }
    if (options.workspaceId !== undefined) {
      this.createOptions.workspaceId = options.workspaceId;
    }
    if (Object.keys(this.env).length > 0) {
      this.createOptions.env = { ...this.env, ...(this.createOptions.env ?? {}) };
    }

    if (options.session) {
      this.session = options.session;
      this.sessionPromise = Promise.resolve(options.session);
      this.paused = options.session.state === "PAUSED";
      this.status = this.paused ? "idle" : "ready";
    }
  }

  /**
   * Lazily create (and cache) the Tenki client.
   */
  private getClient(): TenkiClient {
    if (!this.client) {
      this.client = new TenkiClient(this.clientOptions);
    }
    return this.client;
  }

  /**
   * Return the cached session promise, kicking off `createAndWait` on first
   * call. On failure the cached promise is cleared so the next call retries
   * instead of replaying the rejected promise.
   */
  private ensureSession(): Promise<Session> {
    if (this.status === "destroyed") {
      return Promise.reject(new Error("Sandbox has been destroyed"));
    }
    if (!this.sessionPromise) {
      // Snapshot the generation so a `destroy()` racing this in-flight
      // provisioning is detectable once `createAndWait` finally settles.
      const generation = this.generation;
      const promise = this.getClient()
        .createAndWait(this.createOptions)
        .then((session) => {
          if (generation !== this.generation) {
            // `destroy()` owns teardown, including sessions that finish
            // provisioning after destruction begins. Retain the session so
            // destroy can await close and retry it if the RPC fails.
            if (session) {
              this.sessionsPendingClose.add(session);
            }
            throw new Error("Sandbox has been destroyed");
          }
          // Keep the existing defensive behavior for a malformed SDK/client
          // response; execute() maps a nullish session to an aborted result.
          if (!session) {
            return session;
          }
          this.session = session;
          this.paused = session.state === "PAUSED";
          this.status = this.paused ? "idle" : "ready";
          return session;
        })
        .catch((error) => {
          // Only surface provisioning failure as `error` if we still own the
          // current generation; never clobber a `destroyed` status.
          if (generation === this.generation) {
            this.sessionPromise = undefined;
            this.status = "error";
          }
          throw error;
        });
      this.sessionPromise = promise;
      return promise;
    }
    return this.sessionPromise;
  }

  /**
   * Return the underlying Tenki SDK session, creating it on first call.
   * Used by {@link createTenkiToolkit} and as the escape hatch for Tenki-specific
   * APIs beyond `execute` (SSH, filesystem, port exposure, etc.).
   */
  async getSandbox(): Promise<TenkiSandboxInstance> {
    const session = await this.ensureSession();
    // ensureSession's defensive path can hand back a nullish session; fail with
    // a clear error instead of returning `undefined` typed as a Session.
    if (!session) {
      throw new Error("Tenki client returned no session");
    }
    await this.resumeIfPaused(session);
    return session;
  }

  /**
   * Authorize an SSH public key without revoking keys this adapter already
   * knows about. Tenki's `updateSshAuthorizedKeys` is a full-set replace and
   * the SDK cannot read the current set back, so each update re-sends the
   * constructor's `sshAuthorizedKeys` plus every key previously added here;
   * keys authorized out-of-band via the SDK are not preserved. A key is
   * recorded only after its RPC succeeds, and updates are serialized so
   * concurrent adds cannot lose keys to a stale merge. The accumulator never
   * needs re-applying: a session, once provisioned, is only replaced by
   * {@link destroy}, after which this method rejects.
   */
  async authorizeSshKey(publicKey: string): Promise<{ sessionId: string }> {
    const run = async (): Promise<{ sessionId: string }> => {
      const session = await this.getSandbox();
      const merged = [
        ...new Set([
          ...(this.createOptions.sshAuthorizedKeys ?? []),
          ...this.addedSshKeys,
          publicKey,
        ]),
      ];
      await session.updateSshAuthorizedKeys(merged);
      this.addedSshKeys.add(publicKey);
      return { sessionId: session.id };
    };
    const task = this.sshUpdateChain.then(run);
    this.sshUpdateChain = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  /** Provision the session eagerly (resuming it if a prior {@link stop} paused it). */
  async start(): Promise<void> {
    const session = await this.ensureSession();
    await this.resumeIfPaused(session);
  }

  /**
   * Resume the microVM when a previous {@link stop} paused it, returning the
   * sandbox to `ready` so commands can run again. No-op otherwise.
   *
   * `signal` is the requesting `execute()`'s cancellation: a canceled execute
   * has already returned by the time its queued transition reaches the head of
   * the queue, so the transition bails out instead of issuing a resume RPC
   * nobody is waiting for. The RPC itself is bounded by
   * {@link RESUME_TRANSITION_TIMEOUT_MS} so an unresponsive resume cannot wedge
   * every later lifecycle transition.
   */
  private async resumeIfPaused(session: Session, signal?: AbortSignal): Promise<void> {
    return this.serializeLifecycleTransition(async () => {
      if (this.status === "destroyed" || this.session !== session) {
        throw new Error("Sandbox has been destroyed");
      }
      if (!this.paused) {
        return;
      }
      if (signal?.aborted) {
        throw new Error("Sandbox resume canceled: the requesting execute() timed out or aborted");
      }

      const generation = this.generation;
      await resolveWithin(
        session.resume(),
        RESUME_TRANSITION_TIMEOUT_MS,
        `timed out waiting for session ${session.id} to resume`,
      );

      // Destruction eagerly invalidates the generation and drops the owned
      // session. A resume RPC may still finish afterward, but it must neither
      // resurrect public state nor allow its caller to use the closed session.
      if (generation !== this.generation || this.session !== session) {
        throw new Error("Sandbox has been destroyed");
      }
      this.paused = false;
      this.status = "ready";
    });
  }

  private serializeLifecycleTransition(operation: () => Promise<void>): Promise<void> {
    const transition = this.lifecycleTransition.then(operation, operation);
    this.lifecycleTransition = transition.then(
      () => undefined,
      () => undefined,
    );
    return transition;
  }

  /**
   * Pause the microVM (billing continues per Tenki's pause semantics) and mark
   * the sandbox `idle`. Reversible: {@link start}/{@link execute} resume it.
   */
  async stop(): Promise<void> {
    if (this.status === "destroyed" || !this.sessionPromise) {
      return;
    }

    const generation = this.generation;
    let session: Session;
    try {
      // Do not create a session solely to stop it, but if this sandbox already
      // owns an in-flight provisioning attempt, wait for that exact session and
      // pause it before stop resolves.
      session = await this.sessionPromise;
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }
      throw error;
    }
    // ensureSession's defensive path can hand back a nullish session; there is
    // nothing to pause in that case.
    if (!session) {
      return;
    }

    await this.serializeLifecycleTransition(async () => {
      // Destroy supersedes a queued/in-flight stop and owns session teardown.
      if (this.status === "destroyed" || this.session !== session || this.paused) {
        return;
      }

      const generation = this.generation;
      await session.pause();
      if (generation !== this.generation || this.session !== session) {
        return;
      }
      this.paused = true;
      this.status = "idle";
    });
  }

  /**
   * Close every owned microVM. Best-effort: `destroy()` never rejects — core's
   * `Workspace.destroy()` does not guard against a throwing sandbox, and the
   * sibling providers share this contract. A failed close stays retained in
   * {@link sessionsPendingClose} so a later `destroy()` call retries it.
   */
  async destroy(): Promise<void> {
    if (this.destroyPromise) {
      return this.destroyPromise;
    }

    const operation = this.destroyOwnedSessions();
    this.destroyPromise = operation;
    try {
      await operation;
    } finally {
      if (this.destroyPromise === operation) {
        this.destroyPromise = undefined;
      }
    }
  }

  private async destroyOwnedSessions(): Promise<void> {
    const pendingSession = this.sessionPromise;
    if (this.session) {
      this.sessionsPendingClose.add(this.session);
    }
    this.session = undefined;
    this.sessionPromise = undefined;
    this.paused = false;

    if (this.status !== "destroyed") {
      this.status = "destroyed";
      // Invalidate in-flight provisioning before awaiting it so its generation
      // guard records the late session for teardown instead of resurrecting it.
      this.generation += 1;
    }

    if (pendingSession) {
      try {
        // A pre-supplied or already-resolved session may not pass through the
        // generation guard, so record the fulfilled value here as well. It can
        // be nullish (ensureSession's defensive path); adding that would make
        // close() throw and poison the retry set for every later destroy.
        const settled = await pendingSession;
        if (settled) {
          this.sessionsPendingClose.add(settled);
        }
      } catch {
        // Provisioning failures do not create a session to close. A late
        // success rejected by the generation guard has already retained it.
      }
    }

    await Promise.allSettled(
      [...this.sessionsPendingClose].map(async (session) => {
        await session.close();
        this.sessionsPendingClose.delete(session);
      }),
    );
  }

  getInfo(): Record<string, unknown> {
    return {
      provider: "tenki",
      status: this.status,
      sessionId: this.session?.id,
    };
  }

  getInstructions(): string {
    // Reflect the effective configuration instead of asserting fixed facts: a
    // custom image/snapshot can lack the base tools and standard working
    // directory, and egress can be disabled.
    const usesCustomImage =
      this.createOptions.image !== undefined || this.createOptions.snapshotId !== undefined;
    const lines = ["Commands run in a disposable Tenki Linux microVM."];
    if (!usesCustomImage) {
      lines.push("Base tools: bash, git, node, npm, python3.");
    }
    if (this.cwd) {
      lines.push(`Working directory is ${this.cwd}.`);
    } else if (!usesCustomImage) {
      lines.push("Writable working directory is /home/tenki.");
    }
    lines.push(
      this.createOptions.allowOutbound === false
        ? "Network egress is disabled."
        : "Network egress is enabled.",
    );
    return lines.join(" ");
  }

  /**
   * Pump one of the process output streams into a byte-bounded buffer while
   * forwarding decoded chunks to the caller's streaming callback. Errors are
   * swallowed (best-effort streaming); the final result bytes act as fallback.
   */
  private async pumpStream(
    readable: ReadableStream<Uint8Array>,
    buffer: OutputBuffer,
    maxOutputBytes: number,
    onChunk: ((chunk: string) => void) | undefined,
    signal: AbortSignal,
  ): Promise<void> {
    const reader = readable.getReader();
    // Per-stream incremental decoder so a multi-byte code point split across
    // chunk boundaries is buffered and completed instead of being emitted to
    // `onChunk` as replacement characters. Only allocated when streaming.
    const decoder = onChunk ? new TextDecoder() : undefined;
    const emit = (text: string) => {
      if (!text || !onChunk) {
        return;
      }
      try {
        onChunk(text);
      } catch {
        // ignore streaming callback errors
      }
    };
    let canceled = signal.aborted;
    const cancelReader = () => {
      canceled = true;
      // Canceling a reader releases a pending `read()` in native Web Streams.
      // The underlying stream's cancellation hook may still reject or remain
      // pending, so keep it best-effort and never await it here.
      try {
        void reader.cancel().catch(() => undefined);
      } catch {
        // ignore synchronous cancellation errors from non-standard streams
      }
    };
    if (signal.aborted) {
      cancelReader();
    } else {
      signal.addEventListener("abort", cancelReader, { once: true });
    }
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done || canceled) {
          break;
        }
        appendOutput(buffer, value, maxOutputBytes);
        if (decoder) {
          emit(decoder.decode(value, { stream: true }));
        }
      }
    } catch {
      // A dead pump leaves the buffer silently short; flag it so resolveOutput
      // prefers the resolved run's complete aggregate bytes over partial ones.
      buffer.failed = true;
    } finally {
      // Flush any bytes the decoder is still holding for a partial code point.
      if (decoder) {
        emit(decoder.decode());
      }
      signal.removeEventListener("abort", cancelReader);
      try {
        reader.releaseLock();
      } catch {
        // A non-standard stream may keep a canceled read pending. In that case
        // its eventual settlement still has this pump attached as an observer.
      }
    }
  }

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    if (this.status === "destroyed") {
      throw new Error("Sandbox has been destroyed");
    }

    const startTime = Date.now();
    const normalized = normalizeCommandAndArgs(options.command ?? "", options.args);
    const command = normalized.command.trim();

    if (!command) {
      throw new Error("Sandbox command is required");
    }

    if (options.signal?.aborted) {
      return abortedResult(0);
    }

    const timeoutMs =
      options.timeoutMs === undefined ? this.defaultTimeoutMs : Math.max(0, options.timeoutMs);
    const maxOutputBytes =
      options.maxOutputBytes === undefined
        ? this.maxOutputBytes
        : Math.max(0, options.maxOutputBytes);
    const env = { ...this.env, ...normalizeEnv(options.env) };
    const cwd = options.cwd ?? this.cwd;

    let aborted = false;
    let timedOut = false;
    let handle: ProcessRunHandle | undefined;

    // Every network/process await races this sentinel. The controller also
    // cancels pending stream reads so pumps do not remain locked after execute
    // has returned. Late operation rejections stay observed by
    // `raceCancellation` even when cancellation wins first.
    const cancellationController = new AbortController();
    const cancellationMarker = Symbol("execution canceled");
    let resolveCancellation!: (marker: typeof cancellationMarker) => void;
    const cancellation = new Promise<typeof cancellationMarker>((resolve) => {
      resolveCancellation = resolve;
    });
    const settleCancellation = () => {
      cancellationController.abort();
      resolveCancellation(cancellationMarker);
    };
    const raceCancellation = <T>(
      operation: PromiseLike<T>,
    ): Promise<T | typeof cancellationMarker> => {
      const observed = Promise.resolve(operation);
      // Promise.race observes rejections too, but keep an explicit observer so
      // the containment guarantee is clear when cancellation wins first.
      void observed.catch(() => undefined);
      return Promise.race([observed, cancellation]);
    };

    let killRequested = false;
    const requestKill = () => {
      if (!handle || killRequested) {
        return;
      }
      killRequested = true;
      // Killing is cleanup, not part of the caller-visible deadline: a broken
      // data plane can make it reject, throw synchronously, or never settle.
      try {
        void Promise.resolve(handle.kill()).catch(() => undefined);
      } catch {
        // best-effort process cleanup
      }
    };
    const cancelExecution = (reason: "aborted" | "timedOut") => {
      // Whichever source fires first owns the result classification.
      if (aborted || timedOut) {
        return;
      }
      if (reason === "aborted") {
        aborted = true;
      } else {
        timedOut = true;
      }
      settleCancellation();
      requestKill();
    };

    const cancellationResult = (): WorkspaceSandboxResult => {
      const durationMs = Date.now() - startTime;
      return timedOut ? timedOutResult(durationMs) : abortedResult(durationMs);
    };

    let abortListener: (() => void) | undefined;
    if (options.signal) {
      abortListener = () => {
        cancelExecution("aborted");
      };
      options.signal.addEventListener("abort", abortListener, { once: true });
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        cancelExecution("timedOut");
      }, timeoutMs);
    }

    const stdoutBuffer = initOutputBuffer();
    const stderrBuffer = initOutputBuffer();

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (options.signal && abortListener) {
        options.signal.removeEventListener("abort", abortListener);
      }
    };

    let result: Awaited<ProcessRunHandle> | undefined;

    try {
      // Race provisioning against cancellation so a timeout/abort settles
      // `execute()` promptly instead of blocking on `createAndWait`. When
      // cancellation wins, provisioning keeps running in the background and
      // caches the session (a later `destroy()` closes it via the generation
      // guard). Swallow a late rejection so bailing out here cannot surface as
      // an unhandled promise rejection.
      const session = await raceCancellation(this.ensureSession());

      // A timeout or abort may have fired while provisioning was pending.
      // Short-circuit before launching the process.
      if (session === cancellationMarker) {
        return cancellationResult();
      }
      if (!session) {
        // Not reachable via cancellation — both paths set timedOut/aborted
        // first — so this only fires if the SDK hands back a nullish session.
        return abortedResult(Date.now() - startTime);
      }

      // Resume before launching, and re-check: `session.resume()` is a network
      // RPC, so a timeout/abort can fire while it is in flight — and `handle`
      // does not exist yet, so `requestKill()` would have nothing to kill. This
      // is the only await left between the guards and `session.run()`; the
      // `runOptions` build below is synchronous.
      const resumed = await raceCancellation(
        this.resumeIfPaused(session, cancellationController.signal),
      );
      if (resumed === cancellationMarker) {
        return cancellationResult();
      }

      const runOptions: {
        env?: Record<string, string>;
        cwd?: string;
        stdin: ReadableStream<Uint8Array>;
      } = {
        stdin: stringToReadableStream(options.stdin ?? ""),
      };
      if (Object.keys(env).length > 0) {
        runOptions.env = env;
      }
      if (cwd) {
        runOptions.cwd = cwd;
      }

      handle = session.run([command, ...(normalized.args ?? [])], runOptions);
      // Observe the thenable before touching its stream properties: malformed
      // or already-failed streams must not leave a later run rejection
      // unhandled. A synchronous abort triggered inside a custom `run()` also
      // missed the earlier kill request because assignment had not completed.
      const runCompletion = Promise.resolve(handle);
      void runCompletion.catch(() => undefined);
      if (aborted || timedOut) {
        requestKill();
      }

      const streaming = Promise.all([
        this.pumpStream(
          handle.stdout,
          stdoutBuffer,
          maxOutputBytes,
          options.onStdout,
          cancellationController.signal,
        ),
        this.pumpStream(
          handle.stderr,
          stderrBuffer,
          maxOutputBytes,
          options.onStderr,
          cancellationController.signal,
        ),
      ]);
      void streaming.catch(() => undefined);

      const runResult = await raceCancellation(runCompletion);
      if (runResult !== cancellationMarker) {
        result = runResult;
      }
      if (!aborted && !timedOut) {
        await raceCancellation(streaming);
      }
    } catch (error) {
      if (isCommandTimeoutError(error)) {
        cancelExecution("timedOut");
      } else if (!aborted && !timedOut) {
        // Release stream readers and observe any work that outlives this
        // unexpected failure before propagating it.
        settleCancellation();
        requestKill();
        throw error;
      }
    } finally {
      cleanup();
    }

    const stdoutInfo = resolveOutput(
      stdoutBuffer,
      result ? decodeBytes(result.stdout) : undefined,
      maxOutputBytes,
    );
    const stderrInfo = resolveOutput(
      stderrBuffer,
      result ? decodeBytes(result.stderr) : undefined,
      maxOutputBytes,
    );

    return {
      stdout: stdoutInfo.content,
      // `WorkspaceSandboxResult` has no field for Tenki's `errno`/`reason`, and
      // an exec failure arrives as a resolved run with empty stderr — so fold
      // the diagnostic into stderr rather than dropping the only signal that
      // explains the exit code.
      stderr: appendRunDiagnostic(stderrInfo.content, formatRunDiagnostic(result)),
      exitCode: result ? result.exitCode : null,
      signal: extractSignal(result),
      durationMs: Date.now() - startTime,
      timedOut,
      aborted,
      stdoutTruncated: stdoutInfo.truncated,
      stderrTruncated: stderrInfo.truncated,
    };
  }
}
