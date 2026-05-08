import { isNil, mapValues, omitBy } from "es-toolkit";

const SAFE_SHELL_ARG = /^[A-Za-z0-9_./:@+=-]+$/;

/**
 * Quote a single shell argument so it survives `sh -c` evaluation.
 * Empty → `''`. Safe-charset → as-is. Otherwise → single-quoted with embedded
 * quotes escaped via `'\''`.
 */
export function escapeShellArg(value: string): string {
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
 */
export function buildCommandLine(command: string, args?: string[]): string {
  const safeCommand = escapeShellArg(command);
  if (!args || args.length === 0) {
    return safeCommand;
  }
  return [safeCommand, ...args.map(escapeShellArg)].join(" ");
}

/**
 * Drop nullish entries from an env map and string-coerce the rest.
 */
export function normalizeEnv(env?: Record<string, string | undefined>): Record<string, string> {
  if (isNil(env)) {
    return {};
  }
  return mapValues(omitBy(env, isNil), String);
}

/**
 * Apply non-nullish bindings to `target` (defaults to `process.env`).
 */
export function applyEnvBindings(
  bindings: Record<string, string | undefined>,
  target: Record<string, string | undefined> = process.env,
): void {
  const nonNil = omitBy(bindings, isNil);
  for (const [key, value] of Object.entries(nonNil)) {
    target[key] = value;
  }
}
