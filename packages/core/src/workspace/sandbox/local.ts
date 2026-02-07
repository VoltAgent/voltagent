import { spawn } from "node:child_process";
import { promises as fs, constants as fsConstants } from "node:fs";
import * as path from "node:path";
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
  WorkspaceSandboxStatus,
} from "./types";

export type LocalSandboxOptions = {
  rootDir?: string;
  cleanupOnDestroy?: boolean;
  defaultTimeoutMs?: number;
  maxOutputBytes?: number;
  env?: Record<string, string>;
  inheritProcessEnv?: boolean;
  allowedCommands?: string[];
  blockedCommands?: string[];
  isolation?: LocalSandboxIsolationOptions;
};

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

export type LocalSandboxIsolationProvider = "none" | "sandbox-exec" | "bwrap";

export type LocalSandboxIsolationOptions = {
  provider?: LocalSandboxIsolationProvider;
  allowNetwork?: boolean;
  allowSystemBinaries?: boolean;
  readWritePaths?: string[];
  readOnlyPaths?: string[];
  seatbeltProfilePath?: string;
  bwrapArgs?: string[];
  profile?: string;
};

type OutputBuffer = {
  chunks: Buffer[];
  size: number;
  truncated: boolean;
};

const initOutputBuffer = (): OutputBuffer => ({ chunks: [], size: 0, truncated: false });

const appendOutput = (buffer: OutputBuffer, data: Buffer, maxBytes: number): void => {
  if (maxBytes <= 0) {
    buffer.truncated = true;
    return;
  }

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

const resolvePathEnv = (): Record<string, string> => {
  const pathValue = process.env.PATH ?? process.env.Path ?? process.env.path;
  if (!pathValue) {
    return {};
  }
  return { PATH: String(pathValue) };
};

const isPathWithinRoot = (rootDir: string, candidate: string): boolean => {
  const relative = path.relative(rootDir, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const resolveCwd = (rootDir: string | undefined, cwd?: string): string | undefined => {
  if (!rootDir) {
    return cwd;
  }

  const resolvedRoot = path.resolve(rootDir);
  const resolvedCwd = cwd
    ? path.isAbsolute(cwd)
      ? path.resolve(cwd)
      : path.resolve(resolvedRoot, cwd)
    : resolvedRoot;

  if (!isPathWithinRoot(resolvedRoot, resolvedCwd)) {
    throw new Error(`cwd '${resolvedCwd}' is outside of sandbox root '${resolvedRoot}'`);
  }

  return resolvedCwd;
};

const normalizeCommand = (command: string): string => path.basename(command);

const normalizeIsolationProvider = (
  provider?: LocalSandboxIsolationProvider,
): LocalSandboxIsolationProvider => provider ?? "none";

const resolveIsolationPaths = (
  paths: string[] | undefined,
  rootDir: string | undefined,
): string[] => {
  if (!paths || paths.length === 0) {
    return [];
  }
  return paths
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      if (path.isAbsolute(entry)) {
        return path.resolve(entry);
      }
      if (rootDir) {
        return path.resolve(rootDir, entry);
      }
      return path.resolve(entry);
    });
};

const SYSTEM_BINARIES_PATHS = {
  darwin: [
    "/System/Library",
    "/System/Applications",
    "/usr/bin",
    "/usr/sbin",
    "/bin",
    "/sbin",
    "/usr/lib",
    "/usr/libexec",
    "/usr/share",
    "/usr/local/bin",
    "/opt/homebrew/bin",
  ],
  linux: [
    "/usr/bin",
    "/usr/sbin",
    "/bin",
    "/sbin",
    "/usr/lib",
    "/usr/lib64",
    "/lib",
    "/lib64",
    "/usr/share",
    "/usr/local/bin",
    "/etc",
  ],
};

const getSystemBinaryPaths = (): string[] => {
  if (process.platform === "darwin") {
    return SYSTEM_BINARIES_PATHS.darwin;
  }
  if (process.platform === "linux") {
    return SYSTEM_BINARIES_PATHS.linux;
  }
  return [];
};

const resolveExecutable = async (command: string): Promise<string | null> => {
  const pathValue = process.env.PATH ?? "";
  if (!pathValue) {
    return null;
  }

  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) {
      continue;
    }
    for (const extension of extensions) {
      const candidate = path.join(dir, `${command}${extension}`);
      try {
        await fs.access(candidate, fsConstants.X_OK);
        return candidate;
      } catch {
        // ignore non-executable candidate
      }
    }
  }

  return null;
};

export const detectLocalSandboxIsolation = async (): Promise<LocalSandboxIsolationProvider> => {
  if (process.platform === "darwin") {
    return (await resolveExecutable("sandbox-exec")) ? "sandbox-exec" : "none";
  }
  if (process.platform === "linux") {
    return (await resolveExecutable("bwrap")) ? "bwrap" : "none";
  }
  return "none";
};

const escapeSandboxProfileValue = (value: string): string => value.replace(/"/g, '\\"');

const buildSandboxExecProfile = (options: {
  rootDir?: string;
  allowNetwork?: boolean;
  allowSystemBinaries?: boolean;
  readWritePaths?: string[];
  readOnlyPaths?: string[];
}): string => {
  const resolvedRoot = options.rootDir ? path.resolve(options.rootDir) : undefined;
  const readWritePaths = new Set(resolveIsolationPaths(options.readWritePaths, resolvedRoot));
  const readOnlyPaths = new Set(resolveIsolationPaths(options.readOnlyPaths, resolvedRoot));
  if (options.allowSystemBinaries) {
    for (const entry of getSystemBinaryPaths()) {
      readOnlyPaths.add(entry);
    }
  }

  if (resolvedRoot) {
    readWritePaths.add(resolvedRoot);
  }

  readWritePaths.add("/dev");

  const allowReadAll = readOnlyPaths.size === 0;
  const readAllowedPaths = allowReadAll
    ? null
    : new Set<string>([...readOnlyPaths, ...readWritePaths]);

  const lines: string[] = [];
  lines.push("(version 1)");
  lines.push("(deny default)");
  lines.push("(allow process*)");

  if (allowReadAll) {
    lines.push('(allow file-read* (subpath "/"))');
  } else {
    lines.push(
      `(allow file-read* ${Array.from(readAllowedPaths ?? [])
        .map((p) => `(subpath "${escapeSandboxProfileValue(p)}")`)
        .join(" ")})`,
    );
  }

  if (readWritePaths.size > 0) {
    lines.push(
      `(allow file-write* ${Array.from(readWritePaths)
        .map((p) => `(subpath "${escapeSandboxProfileValue(p)}")`)
        .join(" ")})`,
    );
  }

  if (options.allowNetwork) {
    lines.push("(allow network*)");
  }

  return lines.join("\n");
};

const loadSeatbeltProfile = async (params: {
  rootDir?: string;
  isolation?: LocalSandboxIsolationOptions;
}): Promise<string> => {
  if (params.isolation?.profile) {
    return params.isolation.profile;
  }
  if (params.isolation?.seatbeltProfilePath) {
    return await fs.readFile(params.isolation.seatbeltProfilePath, "utf-8");
  }
  return buildSandboxExecProfile({
    rootDir: params.rootDir,
    allowNetwork: params.isolation?.allowNetwork,
    allowSystemBinaries: params.isolation?.allowSystemBinaries,
    readWritePaths: params.isolation?.readWritePaths,
    readOnlyPaths: params.isolation?.readOnlyPaths,
  });
};

const buildSandboxedCommand = async (params: {
  command: string;
  args: string[];
  cwd?: string;
  isolation?: LocalSandboxIsolationOptions;
  rootDir?: string;
}): Promise<{ command: string; args: string[] }> => {
  const provider = normalizeIsolationProvider(params.isolation?.provider);
  if (provider === "none") {
    return { command: params.command, args: params.args };
  }

  if (provider === "sandbox-exec") {
    if (process.platform !== "darwin") {
      throw new Error("sandbox-exec isolation is only supported on macOS.");
    }
    const profile = await loadSeatbeltProfile({
      rootDir: params.rootDir,
      isolation: params.isolation,
    });

    return {
      command: "sandbox-exec",
      args: ["-p", profile, params.command, ...params.args],
    };
  }

  if (provider === "bwrap") {
    if (process.platform !== "linux") {
      throw new Error("bwrap isolation is only supported on Linux.");
    }

    const resolvedRoot = params.rootDir ? path.resolve(params.rootDir) : undefined;
    const readWritePaths = new Set(
      resolveIsolationPaths(params.isolation?.readWritePaths, resolvedRoot),
    );
    const readOnlyPaths = new Set(
      resolveIsolationPaths(params.isolation?.readOnlyPaths, resolvedRoot),
    );
    if (params.isolation?.allowSystemBinaries) {
      for (const entry of getSystemBinaryPaths()) {
        readOnlyPaths.add(entry);
      }
    }

    if (resolvedRoot) {
      readWritePaths.add(resolvedRoot);
    }

    const allowReadAll = readOnlyPaths.size === 0;
    const bwrapArgs: string[] = [
      "--die-with-parent",
      "--unshare-user",
      "--unshare-pid",
      ...(params.isolation?.bwrapArgs ?? []),
    ];

    const allowNetwork = params.isolation?.allowNetwork === true;
    if (!allowNetwork) {
      bwrapArgs.push("--unshare-net");
    }

    bwrapArgs.push("--proc", "/proc", "--dev", "/dev");

    if (allowReadAll) {
      bwrapArgs.push("--ro-bind", "/", "/");
    } else {
      for (const entry of readOnlyPaths) {
        bwrapArgs.push("--ro-bind", entry, entry);
      }
    }

    for (const entry of readWritePaths) {
      bwrapArgs.push("--bind", entry, entry);
    }

    bwrapArgs.push("--", params.command, ...params.args);

    return { command: "bwrap", args: bwrapArgs };
  }

  return { command: params.command, args: params.args };
};

export class LocalSandbox implements WorkspaceSandbox {
  name = "local";
  status: WorkspaceSandboxStatus = "ready";
  private readonly rootDir?: string;
  private readonly autoRootDir: boolean;
  private readonly cleanupOnDestroy: boolean;
  private readonly defaultTimeoutMs: number;
  private readonly maxOutputBytes: number;
  private readonly env: Record<string, string>;
  private readonly inheritProcessEnv: boolean;
  private readonly allowedCommands?: Set<string>;
  private readonly blockedCommands?: Set<string>;
  private readonly isolation?: LocalSandboxIsolationOptions;

  constructor(options: LocalSandboxOptions = {}) {
    const resolvedRootDir = options.rootDir ?? path.resolve(process.cwd(), ".sandbox");
    this.rootDir = resolvedRootDir;
    this.autoRootDir = options.rootDir === undefined;
    this.cleanupOnDestroy = options.cleanupOnDestroy ?? false;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.env = normalizeEnv(options.env);
    this.inheritProcessEnv = options.inheritProcessEnv === true;
    this.allowedCommands = options.allowedCommands ? new Set(options.allowedCommands) : undefined;
    this.blockedCommands = options.blockedCommands ? new Set(options.blockedCommands) : undefined;
    this.isolation = options.isolation;
  }

  private rootDirReady?: Promise<void>;

  private async ensureRootDir(): Promise<void> {
    if (!this.autoRootDir || !this.rootDir) {
      return;
    }
    if (!this.rootDirReady) {
      this.rootDirReady = fs.mkdir(this.rootDir, { recursive: true }).then(() => undefined);
    }
    await this.rootDirReady;
  }

  static async detectIsolation(): Promise<LocalSandboxIsolationProvider> {
    return detectLocalSandboxIsolation();
  }

  start(): void {
    if (this.status === "destroyed") {
      throw new Error("Sandbox has been destroyed");
    }
    this.status = "ready";
  }

  stop(): void {
    if (this.status === "destroyed") {
      return;
    }
    this.status = "idle";
  }

  destroy(): void {
    if (this.cleanupOnDestroy && this.autoRootDir && this.rootDir) {
      fs.rm(this.rootDir, { recursive: true, force: true }).catch(() => {});
    }
    this.status = "destroyed";
  }

  getInfo(): Record<string, unknown> {
    return {
      name: this.name,
      status: this.status,
      rootDir: this.rootDir,
      autoRootDir: this.autoRootDir,
      cleanupOnDestroy: this.cleanupOnDestroy,
      defaultTimeoutMs: this.defaultTimeoutMs,
      maxOutputBytes: this.maxOutputBytes,
      inheritProcessEnv: this.inheritProcessEnv,
      isolation: this.isolation
        ? {
            provider: normalizeIsolationProvider(this.isolation.provider),
            allowNetwork: this.isolation.allowNetwork,
            allowSystemBinaries: this.isolation.allowSystemBinaries,
            readWritePaths: this.isolation.readWritePaths,
            readOnlyPaths: this.isolation.readOnlyPaths,
            seatbeltProfilePath: this.isolation.seatbeltProfilePath,
            bwrapArgs: this.isolation.bwrapArgs,
            hasProfileOverride: Boolean(this.isolation.profile),
          }
        : undefined,
      allowedCommands: this.allowedCommands ? Array.from(this.allowedCommands) : undefined,
      blockedCommands: this.blockedCommands ? Array.from(this.blockedCommands) : undefined,
    };
  }

  getInstructions(): string | null {
    const lines: string[] = ["Local sandbox for running shell commands."];
    if (this.rootDir) {
      lines.push(`Root directory: ${this.rootDir}`);
    }
    if (this.allowedCommands && this.allowedCommands.size > 0) {
      lines.push(`Allowed commands: ${Array.from(this.allowedCommands).join(", ")}`);
    }
    if (this.blockedCommands && this.blockedCommands.size > 0) {
      lines.push(`Blocked commands: ${Array.from(this.blockedCommands).join(", ")}`);
    }
    return lines.join("\n");
  }

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    if (this.status === "destroyed") {
      throw new Error("Sandbox has been destroyed");
    }
    if (this.status === "idle") {
      this.status = "ready";
    }

    const startTime = Date.now();
    const command = options.command?.trim();

    if (!command) {
      throw new Error("Sandbox command is required");
    }

    const commandKey = normalizeCommand(command);
    if (this.allowedCommands && !this.allowedCommands.has(commandKey)) {
      throw new Error(`Command '${commandKey}' is not allowed`);
    }
    if (this.blockedCommands?.has(commandKey)) {
      throw new Error(`Command '${commandKey}' is blocked`);
    }

    await this.ensureRootDir();
    const cwd = resolveCwd(this.rootDir, options.cwd);
    const timeoutMs =
      options.timeoutMs === undefined ? this.defaultTimeoutMs : Math.max(0, options.timeoutMs);
    const maxOutputBytes =
      options.maxOutputBytes === undefined
        ? this.maxOutputBytes
        : Math.max(0, options.maxOutputBytes);

    const envBase = this.inheritProcessEnv ? normalizeEnv(process.env) : resolvePathEnv();
    const envMerged = {
      ...envBase,
      ...this.env,
      ...normalizeEnv(options.env),
    };

    const stdoutBuffer = initOutputBuffer();
    const stderrBuffer = initOutputBuffer();
    let timedOut = false;
    let aborted = false;

    const { command: execCommand, args: execArgs } = await buildSandboxedCommand({
      command,
      args: options.args ?? [],
      cwd,
      isolation: this.isolation,
      rootDir: this.rootDir,
    });

    return await new Promise<WorkspaceSandboxResult>((resolve, reject) => {
      const proc = spawn(execCommand, execArgs, {
        cwd,
        env: envMerged,
        stdio: "pipe",
      });

      let timeoutId: NodeJS.Timeout | undefined;
      const abortSignal = options.signal;
      const onAbort = () => {
        aborted = true;
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill("SIGKILL");
          }
        }, 1000);
      };

      if (abortSignal) {
        if (abortSignal.aborted) {
          onAbort();
        } else {
          abortSignal.addEventListener("abort", onAbort, { once: true });
        }
      }

      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          proc.kill("SIGTERM");
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill("SIGKILL");
            }
          }, 1000);
        }, timeoutMs);
      }

      proc.stdout?.on("data", (data: Buffer) => {
        appendOutput(stdoutBuffer, data, maxOutputBytes);
        if (options.onStdout) {
          try {
            options.onStdout(data.toString("utf-8"));
          } catch {
            // ignore callback errors
          }
        }
      });

      proc.stderr?.on("data", (data: Buffer) => {
        appendOutput(stderrBuffer, data, maxOutputBytes);
        if (options.onStderr) {
          try {
            options.onStderr(data.toString("utf-8"));
          } catch {
            // ignore callback errors
          }
        }
      });

      proc.on("error", (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (abortSignal) {
          abortSignal.removeEventListener("abort", onAbort);
        }
        reject(error);
      });

      proc.on("close", (code, signal) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (abortSignal) {
          abortSignal.removeEventListener("abort", onAbort);
        }
        resolve({
          stdout: toOutputString(stdoutBuffer),
          stderr: toOutputString(stderrBuffer),
          exitCode: code,
          signal: signal ? String(signal) : undefined,
          durationMs: Date.now() - startTime,
          timedOut,
          aborted,
          stdoutTruncated: stdoutBuffer.truncated,
          stderrTruncated: stderrBuffer.truncated,
        });
      });

      if (options.stdin !== undefined) {
        proc.stdin?.write(options.stdin);
      }
      proc.stdin?.end();
    });
  }
}
