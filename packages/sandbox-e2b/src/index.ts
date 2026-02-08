import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";
import * as e2bModule from "e2b";

export type E2BSandboxOptions = {
  apiKey?: string;
  template?: string;
  sandboxId?: string;
  createOptions?: Record<string, unknown>;
  connectOptions?: Record<string, unknown>;
  env?: Record<string, string>;
  cwd?: string;
  user?: string;
  requestTimeoutMs?: number;
  defaultTimeoutMs?: number;
  maxOutputBytes?: number;
  sandbox?: E2BSdkSandbox;
};

type E2BCommandResult = {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  exit_code?: number;
  signal?: string;
  signalName?: string;
  output?: string;
  result?: string;
};

type E2BCommandHandle = {
  pid?: number;
  wait?: () => Promise<E2BCommandResult>;
  kill?: () => Promise<void> | void;
  sendStdin?: (input: string) => Promise<void> | void;
};

type E2BCommandsClient = {
  run: (
    command: string,
    options?: Record<string, unknown>,
  ) => Promise<E2BCommandResult | E2BCommandHandle>;
  kill?: (pid: number, options?: Record<string, unknown>) => Promise<void> | void;
  sendStdin?: (
    pid: number,
    input: string,
    options?: Record<string, unknown>,
  ) => Promise<void> | void;
};

type E2BSdkSandbox = {
  commands: E2BCommandsClient;
};

type E2BSandboxFactory = {
  create: (
    ...args:
      | [options?: Record<string, unknown>]
      | [template: string, options?: Record<string, unknown>]
  ) => Promise<E2BSdkSandbox>;
  connect: (sandboxId: string, options?: Record<string, unknown>) => Promise<E2BSdkSandbox>;
};

type E2BModule = {
  Sandbox: E2BSandboxFactory;
};

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const SAFE_SHELL_ARG = /^[A-Za-z0-9_./:@+=-]+$/;

type OutputBuffer = {
  chunks: Buffer[];
  size: number;
  truncated: boolean;
};

const initOutputBuffer = (): OutputBuffer => ({ chunks: [], size: 0, truncated: false });

const appendOutput = (buffer: OutputBuffer, chunk: unknown, maxBytes: number): void => {
  if (maxBytes <= 0) {
    buffer.truncated = true;
    return;
  }

  const data =
    typeof chunk === "string"
      ? Buffer.from(chunk, "utf-8")
      : Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(String(chunk), "utf-8");

  const remaining = maxBytes - buffer.size;
  if (remaining <= 0) {
    buffer.truncated = true;
    return;
  }

  if (data.length > remaining) {
    buffer.chunks.push(data.subarray(0, remaining));
    buffer.size += remaining;
    buffer.truncated = true;
    return;
  }

  buffer.chunks.push(data);
  buffer.size += data.length;
};

const toOutputString = (buffer: OutputBuffer): string => {
  if (buffer.chunks.length === 0) {
    return "";
  }
  return Buffer.concat(buffer.chunks, buffer.size).toString("utf-8");
};

const truncateOutput = (
  value: string,
  maxBytes: number,
): { content: string; truncated: boolean } => {
  if (!value) {
    return { content: "", truncated: false };
  }
  if (maxBytes <= 0) {
    return { content: "", truncated: true };
  }
  const buffer = Buffer.from(value, "utf-8");
  if (buffer.length <= maxBytes) {
    return { content: value, truncated: false };
  }
  let end = maxBytes;
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) {
    end -= 1;
  }
  const truncated = buffer.subarray(0, end).toString("utf-8");
  return { content: truncated, truncated: true };
};

const resolveOutput = (
  buffer: OutputBuffer,
  fallback: string | undefined,
  maxBytes: number,
): { content: string; truncated: boolean } => {
  if (buffer.size > 0 || buffer.truncated) {
    return { content: toOutputString(buffer), truncated: buffer.truncated };
  }
  if (!fallback) {
    return { content: "", truncated: false };
  }
  return truncateOutput(fallback, maxBytes);
};

const escapeShellArg = (value: string): string => {
  if (value.length === 0) {
    return "''";
  }
  if (SAFE_SHELL_ARG.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
};

// buildCommandLine escapes both command and arguments; pass a program name in `command`.
const buildCommandLine = (command: string, args?: string[]): string => {
  const safeCommand = escapeShellArg(command);
  if (!args || args.length === 0) {
    return safeCommand;
  }
  return [safeCommand, ...args.map(escapeShellArg)].join(" ");
};

const normalizeEnv = (env?: Record<string, string | undefined>): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!env) {
    return result;
  }
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === null) {
      continue;
    }
    result[key] = String(value);
  }
  return result;
};

const pickFirstString = (value: unknown, keys: string[]): string | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  for (const key of keys) {
    const candidate = (value as Record<string, unknown>)[key];
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return undefined;
};

const extractExitCode = (value: unknown): number | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const exitCode = record.exitCode ?? record.exit_code;
  return typeof exitCode === "number" ? exitCode : null;
};

const extractSignal = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const signal = record.signal ?? record.signalName;
  return typeof signal === "string" ? signal : undefined;
};

const isCommandHandle = (value: unknown): value is E2BCommandHandle => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return typeof (value as E2BCommandHandle).wait === "function";
};

export class E2BSandbox implements WorkspaceSandbox {
  name = "e2b";
  private readonly apiKey?: string;
  private readonly template?: string;
  private readonly sandboxId?: string;
  private readonly createOptions?: Record<string, unknown>;
  private readonly connectOptions?: Record<string, unknown>;
  private readonly env: Record<string, string>;
  private readonly cwd?: string;
  private readonly user?: string;
  private readonly requestTimeoutMs?: number;
  private readonly defaultTimeoutMs: number;
  private readonly maxOutputBytes: number;
  private sandbox?: E2BSdkSandbox;
  private sandboxPromise?: Promise<E2BSdkSandbox>;

  constructor(options: E2BSandboxOptions = {}) {
    this.apiKey = options.apiKey;
    this.template = options.template?.trim() || undefined;
    this.sandboxId = options.sandboxId?.trim() || undefined;
    this.createOptions = options.createOptions;
    this.connectOptions = options.connectOptions;
    this.env = normalizeEnv(options.env);
    this.cwd = options.cwd;
    this.user = options.user;
    this.requestTimeoutMs = options.requestTimeoutMs;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.sandbox = options.sandbox;
  }

  private buildSandboxOptions(base?: Record<string, unknown>): Record<string, unknown> {
    const merged = { ...(base ?? {}) };
    if (this.apiKey !== undefined && merged.apiKey === undefined) {
      merged.apiKey = this.apiKey;
    }
    return merged;
  }

  private async createSandbox(): Promise<E2BSdkSandbox> {
    const { Sandbox } = e2bModule as unknown as E2BModule;
    if (this.sandboxId) {
      const connectOptions = this.buildSandboxOptions(this.connectOptions);
      return await Sandbox.connect(this.sandboxId, connectOptions);
    }

    const createOptions = this.buildSandboxOptions(this.createOptions);
    if (this.template) {
      return await Sandbox.create(this.template, createOptions);
    }
    return await Sandbox.create(createOptions);
  }

  private async getSandbox(): Promise<E2BSdkSandbox> {
    if (this.sandbox) {
      return this.sandbox;
    }
    if (!this.sandboxPromise) {
      this.sandboxPromise = this.createSandbox()
        .then((sandbox) => {
          this.sandbox = sandbox;
          return sandbox;
        })
        .catch((error) => {
          this.sandboxPromise = undefined;
          throw error;
        });
    }
    return this.sandboxPromise;
  }

  private async killCommand(sandbox: E2BSdkSandbox, handle?: E2BCommandHandle): Promise<void> {
    if (!handle) {
      return;
    }
    if (typeof handle.kill === "function") {
      await handle.kill();
      return;
    }
    if (handle.pid === undefined || typeof sandbox.commands.kill !== "function") {
      return;
    }
    const options =
      this.requestTimeoutMs === undefined ? undefined : { requestTimeoutMs: this.requestTimeoutMs };
    await sandbox.commands.kill(handle.pid, options);
  }

  private async sendStdin(
    sandbox: E2BSdkSandbox,
    handle: E2BCommandHandle,
    input: string,
  ): Promise<void> {
    if (typeof handle.sendStdin === "function") {
      await handle.sendStdin(input);
      return;
    }
    if (handle.pid === undefined || typeof sandbox.commands.sendStdin !== "function") {
      throw new Error("Workspace sandbox does not support stdin for this command.");
    }
    const options =
      this.requestTimeoutMs === undefined ? undefined : { requestTimeoutMs: this.requestTimeoutMs };
    await sandbox.commands.sendStdin(handle.pid, input, options);
  }

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    const startTime = Date.now();
    const command = options.command?.trim();

    if (!command) {
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

    const timeoutMs =
      options.timeoutMs === undefined ? this.defaultTimeoutMs : Math.max(0, options.timeoutMs);
    const deadline = timeoutMs > 0 ? startTime + timeoutMs : undefined;
    let aborted = false;
    let timedOut = false;

    const sandbox =
      timeoutMs > 0
        ? await new Promise<E2BSdkSandbox | null>((resolve, reject) => {
            const remaining = deadline ? Math.max(0, deadline - Date.now()) : timeoutMs;
            if (remaining <= 0) {
              timedOut = true;
              resolve(null);
              return;
            }
            let settled = false;
            const creationTimeoutId = setTimeout(() => {
              if (settled) {
                return;
              }
              settled = true;
              timedOut = true;
              resolve(null);
            }, remaining);
            this.getSandbox()
              .then((resolved) => {
                if (settled) {
                  return;
                }
                settled = true;
                clearTimeout(creationTimeoutId);
                resolve(resolved);
              })
              .catch((error) => {
                if (settled) {
                  return;
                }
                settled = true;
                clearTimeout(creationTimeoutId);
                reject(error);
              });
          })
        : await this.getSandbox();

    if (!sandbox) {
      return {
        stdout: "",
        stderr: "",
        exitCode: null,
        durationMs: Date.now() - startTime,
        timedOut: true,
        aborted: false,
        stdoutTruncated: false,
        stderrTruncated: false,
      };
    }

    const maxOutputBytes =
      options.maxOutputBytes === undefined
        ? this.maxOutputBytes
        : Math.max(0, options.maxOutputBytes);
    const effectiveTimeoutMs =
      deadline !== undefined ? Math.max(0, deadline - Date.now()) : timeoutMs;
    if (deadline !== undefined && effectiveTimeoutMs === 0) {
      timedOut = true;
      return {
        stdout: "",
        stderr: "",
        exitCode: null,
        durationMs: Date.now() - startTime,
        timedOut,
        aborted,
        stdoutTruncated: false,
        stderrTruncated: false,
      };
    }
    const envs = {
      ...this.env,
      ...normalizeEnv(options.env),
    };

    const stdoutBuffer = initOutputBuffer();
    const stderrBuffer = initOutputBuffer();
    let commandHandle: E2BCommandHandle | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;

    const requestKill = async (): Promise<void> => {
      await this.killCommand(sandbox, commandHandle);
    };

    if (options.signal) {
      abortListener = () => {
        aborted = true;
        requestKill().catch(() => undefined);
      };
      options.signal.addEventListener("abort", abortListener, { once: true });
    }

    if (effectiveTimeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        requestKill().catch(() => undefined);
      }, effectiveTimeoutMs);
    }

    const runCommand = async (): Promise<E2BCommandResult> => {
      const commandLine = buildCommandLine(command, options.args);
      const runOptions: Record<string, unknown> = {
        onStdout: (data: string) => {
          appendOutput(stdoutBuffer, data, maxOutputBytes);
          if (options.onStdout) {
            try {
              options.onStdout(data);
            } catch {
              // ignore streaming callback errors
            }
          }
        },
        onStderr: (data: string) => {
          appendOutput(stderrBuffer, data, maxOutputBytes);
          if (options.onStderr) {
            try {
              options.onStderr(data);
            } catch {
              // ignore streaming callback errors
            }
          }
        },
      };

      if (this.cwd || options.cwd) {
        runOptions.cwd = options.cwd ?? this.cwd;
      }
      if (this.user) {
        runOptions.user = this.user;
      }
      if (Object.keys(envs).length > 0) {
        runOptions.envs = envs;
      }
      if (effectiveTimeoutMs > 0) {
        runOptions.timeoutMs = effectiveTimeoutMs;
      }
      if (this.requestTimeoutMs !== undefined) {
        runOptions.requestTimeoutMs = this.requestTimeoutMs;
      }

      const needsHandle =
        options.stdin !== undefined || Boolean(options.signal) || effectiveTimeoutMs > 0;
      if (needsHandle) {
        runOptions.background = true;
      }
      if (options.stdin !== undefined) {
        runOptions.stdin = true;
      }

      const response = await sandbox.commands.run(commandLine, runOptions);

      if (isCommandHandle(response)) {
        commandHandle = response;
        if (aborted || timedOut) {
          await this.killCommand(sandbox, response);
          return {};
        }
        if (options.stdin !== undefined) {
          await this.sendStdin(sandbox, response, options.stdin);
        }
        if (typeof response.wait === "function") {
          return await response.wait();
        }
      }

      return response as E2BCommandResult;
    };

    let result: E2BCommandResult | undefined;

    try {
      result = await runCommand();
    } catch (error) {
      if (!aborted && !timedOut) {
        throw error;
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (options.signal && abortListener) {
        options.signal.removeEventListener("abort", abortListener);
      }
    }

    const stdoutFallback = pickFirstString(result, ["stdout", "output", "result"]);
    const stderrFallback = pickFirstString(result, ["stderr"]);

    const stdoutInfo = resolveOutput(stdoutBuffer, stdoutFallback, maxOutputBytes);
    const stderrInfo = resolveOutput(stderrBuffer, stderrFallback, maxOutputBytes);

    return {
      stdout: stdoutInfo.content,
      stderr: stderrInfo.content,
      exitCode: extractExitCode(result),
      signal: extractSignal(result),
      durationMs: Date.now() - startTime,
      timedOut,
      aborted,
      stdoutTruncated: stdoutInfo.truncated,
      stderrTruncated: stderrInfo.truncated,
    };
  }
}
