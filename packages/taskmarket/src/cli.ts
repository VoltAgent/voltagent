import { type ChildProcess, spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
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

interface OutputCapture {
  bytes: number;
  chunks: string[];
  decoder: StringDecoder;
}

function boundedDecodedOutput(capture: OutputCapture): string {
  const value = capture.chunks.join("");
  const encoded = Buffer.from(value, "utf8");
  if (encoded.byteLength <= capture.bytes) return value;
  return new StringDecoder("utf8").write(encoded.subarray(0, capture.bytes));
}

function cliEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    TASKMARKET_API_URL: TASKMARKET_API_ORIGIN,
  };
  for (const key of INHERITED_ENVIRONMENT_KEYS) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  return environment;
}

function terminateProcessTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
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
  if (process.platform === "win32") {
    throw new Error(
      "The default Taskmarket CLI runner is disabled on Windows; inject a runner that contains the CLI in a kill-on-close Job Object",
    );
  }

  return {
    run(args) {
      return new Promise<CliRunResult>((resolve, reject) => {
        const child = spawn(binary, [...args], {
          detached: true,
          env: cliEnvironment(),
          shell: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        const stdout: OutputCapture = {
          bytes: 0,
          chunks: [],
          decoder: new StringDecoder("utf8"),
        };
        const stderr: OutputCapture = {
          bytes: 0,
          chunks: [],
          decoder: new StringDecoder("utf8"),
        };
        let outputBytes = 0;
        let timedOut = false;
        let outputLimitExceeded = false;
        let terminationStarted = false;

        const terminate = () => {
          if (terminationStarted) return;
          terminationStarted = true;
          terminateProcessTree(child);
        };

        const collect = (target: OutputCapture) => (chunk: Buffer) => {
          if (outputLimitExceeded) return;
          const remaining = maxOutputBytes - outputBytes;
          const accepted = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
          if (accepted.byteLength > 0) {
            outputBytes += accepted.byteLength;
            target.bytes += accepted.byteLength;
            const decoded = target.decoder.write(accepted);
            if (decoded) target.chunks.push(decoded);
          }
          if (accepted.byteLength < chunk.byteLength) {
            outputLimitExceeded = true;
            terminate();
          }
        };

        child.stdout.on("data", collect(stdout));
        child.stderr.on("data", collect(stderr));

        const timer = setTimeout(() => {
          timedOut = true;
          terminate();
        }, timeoutMs);
        timer.unref();

        child.once("error", (error) => {
          clearTimeout(timer);
          reject(new Error(`Unable to start the Taskmarket CLI: ${error.message}`));
        });
        child.once("close", (exitCode) => {
          clearTimeout(timer);
          // When the limit terminated the process, StringDecoder may hold the
          // leading bytes of a split UTF-8 sequence. Deliberately omit those
          // bytes instead of flushing a replacement character beyond the cap.
          if (!outputLimitExceeded) {
            const stdoutTail = stdout.decoder.end();
            const stderrTail = stderr.decoder.end();
            if (stdoutTail) stdout.chunks.push(stdoutTail);
            if (stderrTail) stderr.chunks.push(stderrTail);
          }
          resolve({
            stdout: boundedDecodedOutput(stdout),
            stderr: boundedDecodedOutput(stderr),
            exitCode,
            timedOut,
            outputLimitExceeded,
          });
        });
      });
    },
  };
}
