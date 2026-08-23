import { spawn } from "node:child_process";
import { TASKMARKET_API_ORIGIN } from "./types";
import type { CliRunResult, TaskmarketCliRunner, TaskmarketCliRunnerOptions } from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const INHERITED_ENVIRONMENT_KEYS = [
  "HOME",
  "PATH",
  "PATHEXT",
  "SYSTEMROOT",
  "SystemRoot",
  "WINDIR",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "TS_KEYRING_BACKEND",
  "LANG",
  "LC_ALL",
  "TMP",
  "TEMP",
  "TMPDIR",
] as const;

function cliEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    TASKMARKET_API_URL: TASKMARKET_API_ORIGIN,
  };
  for (const key of INHERITED_ENVIRONMENT_KEYS) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  return environment;
}

export function createTaskmarketCliRunner(
  options: TaskmarketCliRunnerOptions = {},
): TaskmarketCliRunner {
  const binary = options.binary?.trim() || "taskmarket";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000) {
    throw new Error("Taskmarket CLI timeout must be an integer of at least 1000 ms");
  }
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 4096) {
    throw new Error("Taskmarket CLI output limit must be an integer of at least 4096 bytes");
  }

  return {
    run(args) {
      return new Promise<CliRunResult>((resolve, reject) => {
        const child = spawn(binary, [...args], {
          env: cliEnvironment(),
          shell: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let outputBytes = 0;
        let timedOut = false;
        let outputLimitExceeded = false;

        const collect = (target: Buffer[]) => (chunk: Buffer) => {
          if (outputLimitExceeded) return;
          outputBytes += chunk.byteLength;
          if (outputBytes > maxOutputBytes) {
            outputLimitExceeded = true;
            child.kill("SIGKILL");
            return;
          }
          target.push(chunk);
        };

        child.stdout.on("data", collect(stdout));
        child.stderr.on("data", collect(stderr));

        const timer = setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, timeoutMs);
        timer.unref();

        child.once("error", (error) => {
          clearTimeout(timer);
          reject(new Error(`Unable to start the Taskmarket CLI: ${error.message}`));
        });
        child.once("close", (exitCode) => {
          clearTimeout(timer);
          resolve({
            stdout: Buffer.concat(stdout).toString("utf8"),
            stderr: Buffer.concat(stderr).toString("utf8"),
            exitCode,
            timedOut,
            outputLimitExceeded,
          });
        });
      });
    },
  };
}
