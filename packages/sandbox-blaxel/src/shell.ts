import {
  type NormalizedCommand,
  type WorkspaceSandboxExecuteOptions,
  normalizeCommandAndArgs,
} from "@voltagent/core";
import { attempt, isEmptyObject, isNil, mapValues, omitBy } from "es-toolkit";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
} from "./constants";
import type { BlaxelSandboxConfig } from "./types";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Fully resolved per-call execute inputs — the result of merging
 * {@link WorkspaceSandboxExecuteOptions} with {@link BlaxelSandboxConfig} defaults.
 * `command` is shell-escaped and ready for `sh -c`.
 */
export type ParsedExecuteOptions = {
  command: string;
  env?: Record<string, string>;
  cwd?: string;
  timeoutMs: number;
  maxOutputBytes: number;
  pollIntervalMs: number;
};

/**
 * Resolve per-call execute options against constructor-time config defaults.
 * Returns an `[error, options]` tuple matching the es-toolkit `attempt` shape:
 * - On invalid input (stdin set, empty command), `error` is populated.
 * - Otherwise `options` carries everything `execute()` needs for the SDK call.
 */
export function parseOptions(
  options: WorkspaceSandboxExecuteOptions,
  config?: BlaxelSandboxConfig,
) {
  return attempt<ParsedExecuteOptions, Error>((): ParsedExecuteOptions => {
    if (options.stdin !== undefined) {
      throw new Error("Workspace sandbox does not support stdin for this command.");
    }
    const { command, args } = parseCommand(options);
    if (command.length === 0) {
      throw new Error("Sandbox command is required");
    }
    const env = parseEnv(options);
    return {
      command: buildCommandLine(command, args),
      env: isEmptyObject(env) ? undefined : env,
      cwd: options.cwd ?? config?.cwd,
      timeoutMs: resolveCallOption(
        options.timeoutMs,
        config?.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
      ),
      maxOutputBytes: resolveCallOption(
        options.maxOutputBytes,
        config?.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
      ),
      pollIntervalMs: config?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    };
  });
}

/**
 * Apply non-nullish bindings to `process.env`.
 */
export function applyEnvBindings(bindings: Record<string, string | undefined>): void {
  const nonNil = omitBy(bindings, isNil);
  for (const [key, value] of Object.entries(nonNil)) {
    process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Charset that is safe to leave unquoted in `sh -c`. Anything outside this set
 * gets single-quoted by {@link escapeShellArg}.
 *
 * @private
 */
const SAFE_SHELL_ARG = /^[A-Za-z0-9_./:@+=-]+$/;

/**
 * Normalize `command` / `args` from execute options into a {@link NormalizedCommand}.
 * The returned `command` is already trimmed by `normalizeCommandAndArgs`.
 *
 * @private
 */
function parseCommand(
  options: Pick<WorkspaceSandboxExecuteOptions, "command" | "args">,
): NormalizedCommand {
  return normalizeCommandAndArgs(options.command ?? "", options.args);
}

/**
 * Pick the per-call value when provided, otherwise the configured fallback.
 * Negative call values are clamped to `0` so callers can't accidentally pass a
 * pathological timeout / byte limit.
 *
 * @private
 */
function resolveCallOption(callValue: number | undefined, fallback: number): number {
  return callValue === undefined ? fallback : Math.max(0, callValue);
}

/**
 * Quote a single shell argument so it survives `sh -c` evaluation.
 * Empty → `''`. Safe-charset → as-is. Otherwise → single-quoted with embedded
 * quotes escaped via `'\''`.
 *
 * @private
 */
function escapeShellArg(value: string): string {
  if (value.length === 0) {
    return "''";
  }
  if (SAFE_SHELL_ARG.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Join a command and its arguments into a shell-safe command line.
 *
 * @private
 */
function buildCommandLine(command: string, args?: string[]): string {
  const safeCommand = escapeShellArg(command);
  if (!args || args.length === 0) {
    return safeCommand;
  }
  return [safeCommand, ...args.map(escapeShellArg)].join(" ");
}

/**
 * Pull `env` from execute options, drop nullish entries, and string-coerce the rest.
 *
 * @private
 */
function parseEnv(options: Pick<WorkspaceSandboxExecuteOptions, "env">): Record<string, string> {
  if (isNil(options.env)) {
    return {};
  }
  return mapValues(omitBy(options.env, isNil), String);
}
