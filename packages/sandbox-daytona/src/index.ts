import * as daytonaModule from "@daytonaio/sdk";
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";

export type DaytonaSandboxOptions = {
  apiKey?: string;
  apiUrl?: string;
  target?: string;
  clientOptions?: Record<string, unknown>;
  createParams?: Record<string, unknown>;
  createTimeoutSeconds?: number;
  env?: Record<string, string>;
  cwd?: string;
  defaultTimeoutMs?: number;
  maxOutputBytes?: number;
  sandbox?: DaytonaSandboxInstance;
};

type DaytonaExecResult = {
  exitCode?: number;
  result?: string;
  artifacts?: {
    stdout?: string;
    stderr?: string;
  };
};

type DaytonaSandboxInstance = {
  process: {
    executeCommand: (
      command: string,
      cwd?: string,
      env?: Record<string, string>,
      timeoutSeconds?: number,
    ) => Promise<DaytonaExecResult>;
  };
};

type DaytonaClient = {
  create: (
    params?: Record<string, unknown>,
    options?: { timeout?: number },
  ) => Promise<DaytonaSandboxInstance>;
};

type DaytonaModule = {
  Daytona: new (options?: Record<string, unknown>) => DaytonaClient;
};

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const SAFE_SHELL_ARG = /^[A-Za-z0-9_./:@+=-]+$/;

const escapeShellArg = (value: string): string => {
  if (value.length === 0) {
    return "''";
  }
  if (SAFE_SHELL_ARG.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
};

const buildCommandLine = (command: string, args?: string[]): string => {
  if (!args || args.length === 0) {
    return command;
  }
  return [command, ...args].map(escapeShellArg).join(" ");
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
  const size = Buffer.byteLength(value, "utf-8");
  if (size <= maxBytes) {
    return { content: value, truncated: false };
  }
  const truncated = Buffer.from(value, "utf-8").subarray(0, maxBytes).toString("utf-8");
  return { content: truncated, truncated: true };
};

const extractString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export class DaytonaSandbox implements WorkspaceSandbox {
  name = "daytona";
  private readonly apiKey?: string;
  private readonly apiUrl?: string;
  private readonly target?: string;
  private readonly clientOptions?: Record<string, unknown>;
  private readonly createParams?: Record<string, unknown>;
  private readonly createTimeoutSeconds?: number;
  private readonly env: Record<string, string>;
  private readonly cwd?: string;
  private readonly defaultTimeoutMs: number;
  private readonly maxOutputBytes: number;
  private sandbox?: DaytonaSandboxInstance;
  private sandboxPromise?: Promise<DaytonaSandboxInstance>;

  constructor(options: DaytonaSandboxOptions = {}) {
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl;
    this.target = options.target;
    this.clientOptions = options.clientOptions;
    this.createParams = options.createParams;
    this.createTimeoutSeconds = options.createTimeoutSeconds;
    this.env = normalizeEnv(options.env);
    this.cwd = options.cwd;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.sandbox = options.sandbox;
  }

  private buildClientOptions(): Record<string, unknown> {
    const merged = { ...(this.clientOptions ?? {}) };
    if (this.apiKey !== undefined && merged.apiKey === undefined) {
      merged.apiKey = this.apiKey;
    }
    if (this.apiUrl !== undefined && merged.apiUrl === undefined) {
      merged.apiUrl = this.apiUrl;
    }
    if (this.target !== undefined && merged.target === undefined) {
      merged.target = this.target;
    }
    return merged;
  }

  private async createSandbox(): Promise<DaytonaSandboxInstance> {
    const { Daytona } = daytonaModule as unknown as DaytonaModule;
    const client = new Daytona(this.buildClientOptions());
    const options = this.createTimeoutSeconds ? { timeout: this.createTimeoutSeconds } : undefined;
    return await client.create(this.createParams, options);
  }

  private async getSandbox(): Promise<DaytonaSandboxInstance> {
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

    const sandbox = await this.getSandbox();
    const maxOutputBytes =
      options.maxOutputBytes === undefined
        ? this.maxOutputBytes
        : Math.max(0, options.maxOutputBytes);
    const timeoutMs =
      options.timeoutMs === undefined ? this.defaultTimeoutMs : Math.max(0, options.timeoutMs);
    const timeoutSeconds = timeoutMs > 0 ? Math.ceil(timeoutMs / 1000) : undefined;

    const envs = {
      ...this.env,
      ...normalizeEnv(options.env),
    };

    let aborted = false;
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;

    if (options.signal) {
      abortListener = () => {
        aborted = true;
      };
      options.signal.addEventListener("abort", abortListener, { once: true });
    }

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
      }, timeoutMs);
    }

    let response: DaytonaExecResult;
    try {
      const commandLine = buildCommandLine(command, options.args);
      response = await sandbox.process.executeCommand(
        commandLine,
        options.cwd ?? this.cwd,
        Object.keys(envs).length > 0 ? envs : undefined,
        timeoutSeconds,
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (options.signal && abortListener) {
        options.signal.removeEventListener("abort", abortListener);
      }
    }

    const stdoutRaw =
      extractString(response.artifacts?.stdout) ?? extractString(response.result) ?? "";
    const stderrRaw = extractString(response.artifacts?.stderr) ?? "";

    const stdoutInfo = truncateOutput(stdoutRaw, maxOutputBytes);
    const stderrInfo = truncateOutput(stderrRaw, maxOutputBytes);

    return {
      stdout: stdoutInfo.content,
      stderr: stderrInfo.content,
      exitCode: typeof response.exitCode === "number" ? response.exitCode : null,
      durationMs: Date.now() - startTime,
      timedOut,
      aborted,
      stdoutTruncated: stdoutInfo.truncated,
      stderrTruncated: stderrInfo.truncated,
    };
  }
}
